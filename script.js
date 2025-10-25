import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'url:pdfjs-dist/build/pdf.worker.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
import { Buffer } from 'buffer'; // Bufferポリフィルをインポート
import heicConvert from 'heic-convert';

window.fontCache = window.fontCache || {}; // フォントキャッシュをグローバルスコープに定義
const fontCache = window.fontCache; // 既存のコードとの互換性のために参照を保持

// SPAのルート要素
const app = document.getElementById('app');
const loadingOverlay = document.getElementById('loadingOverlay');

let selectedPdfFile = null;
let pdfPageSize = { width: 595.28, height: 841.89 }; // A4のデフォルト値(pt)
let selectedImageFiles = []; // [{ file: File, previewUrl: string, pdfEmbedBytes: ArrayBuffer, pdfEmbedType: string, aspectRatio: number }]
let processedPdfBytes = null; // 処理済みPDFのバイトデータを保持

// DOM要素を動的に取得するためのヘルパー関数
const getElement = (id) => document.getElementById(id);

// Function to display PDF preview
function displayPdfPreview(file) {
    const pdfPreviewContainer = getElement('pdfPreviewContainer');
    if (!pdfPreviewContainer) return;

    if (!file) {
        pdfPreviewContainer.innerHTML = '<p>PDFファイルを選択してください。</p>';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target && e.target.result) {
            const pdfUrl = URL.createObjectURL(file);
            const viewportHeight = window.innerHeight - 250;
            pdfPreviewContainer.innerHTML = `
                <embed src="${pdfUrl}" type="application/pdf" width="100%" height="${viewportHeight}px" />
            `;
        }
    };
    reader.readAsArrayBuffer(file);
}

// Function to display processed PDF preview
function displayProcessedPdfPreview(pdfBytes) {
    const pdfPreviewContainer = getElement('pdfPreviewContainer');
    const downloadLink = getElement('downloadLink');
    if (!pdfPreviewContainer || !downloadLink) return;

    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const viewportHeight = window.innerHeight - 250;
    pdfPreviewContainer.innerHTML = `
        <embed src="${url}" type="application/pdf" width="100%" height="${viewportHeight}px" />
    `;
    downloadLink.href = url;
    downloadLink.download = 'modified.pdf';
    downloadLink.style.display = 'block';
}

// Function to display image previews
function displayImagePreviews(imageFileObjects) {
    const imagePreviewContainer = getElement('imagePreviewContainer');
    if (!imagePreviewContainer) return;

    console.log('displayImagePreviews: 複数画像プレビュー表示関数が呼び出されました。');
    imagePreviewContainer.innerHTML = ''; // 以前のプレビューをクリア

    if (imageFileObjects.length === 0) {
        imagePreviewContainer.innerHTML = '<p>画像ファイルを選択するとここにプレビューが表示されます。</p>';
        console.log('displayImagePreviews: 画像ファイルが選択されていません。メッセージを表示しました。');
        return;
    }

    imageFileObjects.forEach((imageObj, index) => {
        console.log(`displayImagePreviews: ファイル ${index} (${imageObj.file.name}) のプレビューを表示中...`);
        appendImageToPreview(imageObj.previewUrl, imageObj.file.name, imageObj.id); // imageObj.idを使用
    });
}

function appendImageToPreview(src, fileName, id) { // indexではなくidを受け取る
    const imagePreviewContainer = getElement('imagePreviewContainer');
    if (!imagePreviewContainer) return;

    const previewItem = document.createElement('div');
    previewItem.classList.add('image-preview-item');
    previewItem.dataset.id = id; // SortableJSのためにdataset.idを使用

    const dragHandle = document.createElement('div');
    dragHandle.classList.add('drag-handle');
    dragHandle.innerHTML = '<div></div><div></div><div></div>'; // 三本線アイコン

    const img = document.createElement('img');
    img.src = src;
    img.classList.add('image-preview');
    img.alt = fileName;

    const captionInputGroup = document.createElement('div');
    captionInputGroup.classList.add('inputs-wrapper', 'caption-input-group');

    const captionLabel = document.createElement('label');
    captionLabel.textContent = 'キャプション:';
    captionLabel.htmlFor = `caption-input-${id}`;
    captionInputGroup.appendChild(captionLabel);

    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.id = `caption-input-${id}`;
    captionInput.classList.add('image-caption-input');
    captionInput.placeholder = 'キャプションを入力';
    captionInputGroup.appendChild(captionInput);

    const imageObj = selectedImageFiles.find(item => item.id === id);
    if (imageObj && imageObj.caption !== undefined) {
        captionInput.value = imageObj.caption;
    } else {
        captionInput.value = fileName;
        if (imageObj) imageObj.caption = fileName;
    }
    captionInput.addEventListener('input', (event) => {
        const targetImage = selectedImageFiles.find(item => item.id === id);
        if (targetImage) {
            targetImage.caption = event.target.value;
            updateRealtimePreview();
        }
    });

    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-image-btn');
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', () => {
        removeImage(id);
    });

    const captionFontSizeWrapper = document.createElement('div');
    captionFontSizeWrapper.classList.add('inputs-wrapper', 'caption-font-size-wrapper');

    const captionFontSizeLabel = document.createElement('label');
    captionFontSizeLabel.textContent = 'フォントサイズ:';
    captionFontSizeWrapper.appendChild(captionFontSizeLabel);

    const captionFontSizeSlider = document.createElement('input');
    captionFontSizeSlider.type = 'range';
    captionFontSizeSlider.min = '5';
    captionFontSizeSlider.max = '30';
    captionFontSizeSlider.value = imageObj ? imageObj.captionFontSize : '10';
    captionFontSizeSlider.classList.add('caption-font-size-slider');
    captionFontSizeWrapper.appendChild(captionFontSizeSlider);

    const captionFontSizeNumber = document.createElement('input');
    captionFontSizeNumber.type = 'number';
    captionFontSizeNumber.min = '5';
    captionFontSizeNumber.max = '30';
    captionFontSizeNumber.value = imageObj ? imageObj.captionFontSize : '10';
    captionFontSizeNumber.classList.add('caption-font-size-number');
    captionFontSizeWrapper.appendChild(captionFontSizeNumber);

    captionFontSizeSlider.addEventListener('input', (event) => {
        captionFontSizeNumber.value = event.target.value;
        const targetImage = selectedImageFiles.find(item => item.id === id);
        if (targetImage) {
            targetImage.captionFontSize = parseInt(event.target.value);
            updateRealtimePreview();
        }
    });
    captionFontSizeNumber.addEventListener('input', (event) => {
        captionFontSizeSlider.value = event.target.value;
        const targetImage = selectedImageFiles.find(item => item.id === id);
        if (targetImage) {
            targetImage.captionFontSize = parseInt(event.target.value);
            updateRealtimePreview();
        }
    });

    const textAndControlsWrapper = document.createElement('div');
    textAndControlsWrapper.classList.add('inputs-wrapper', 'image-caption-controls-wrapper');
    textAndControlsWrapper.appendChild(captionInputGroup);
    textAndControlsWrapper.appendChild(captionFontSizeWrapper);

    const fontColorWrapper = document.createElement('div');
    fontColorWrapper.classList.add('inputs-wrapper', 'caption-font-color-wrapper');

    const fontColorLabel = document.createElement('label');
    fontColorLabel.textContent = 'フォントカラー:';
    fontColorWrapper.appendChild(fontColorLabel);

    const fontColorInput = document.createElement('input');
    fontColorInput.type = 'color';
    fontColorInput.value = imageObj ? imageObj.captionFontColor : '#000000';
    fontColorInput.classList.add('caption-font-color-input');
    fontColorWrapper.appendChild(fontColorInput);
    textAndControlsWrapper.appendChild(fontColorWrapper);

    fontColorInput.addEventListener('input', (event) => {
        const targetImage = selectedImageFiles.find(item => item.id === id);
        if (targetImage) {
            targetImage.captionFontColor = event.target.value;
            updateRealtimePreview();
        }
    });

    const fontFamilyWrapper = document.createElement('div');
    fontFamilyWrapper.classList.add('inputs-wrapper', 'caption-font-family-wrapper');

    const fontFamilyLabel = document.createElement('label');
    fontFamilyLabel.textContent = 'フォントファミリー:';
    fontFamilyWrapper.appendChild(fontFamilyLabel);

    const fontFamilySelect = document.createElement('select');
    fontFamilySelect.classList.add('caption-font-family-select');
    const fonts = [
        { value: 'Helvetica', text: 'Helvetica' },
        { value: 'Times-Roman', text: 'Times-Roman' },
        { value: 'Courier', text: 'Courier' },
        { value: 'ZapfDingbats', text: 'ZapfDingbats' },
        { value: 'Symbol', text: 'Symbol' },
        { value: 'NotoSansJP', text: 'Noto Sans JP' }
    ];
    fonts.forEach(font => {
        const option = document.createElement('option');
        option.value = font.value;
        option.textContent = font.text;
        fontFamilySelect.appendChild(option);
    });
    fontFamilySelect.value = imageObj ? imageObj.captionFontFamily : 'Helvetica';
    fontFamilyWrapper.appendChild(fontFamilySelect);
    textAndControlsWrapper.appendChild(fontFamilyWrapper);

    fontFamilySelect.addEventListener('change', (event) => {
        const targetImage = selectedImageFiles.find(item => item.id === id);
        if (targetImage) {
            targetImage.captionFontFamily = event.target.value;
            updateRealtimePreview();
        }
    });

    previewItem.appendChild(dragHandle);
    previewItem.appendChild(img);
    previewItem.appendChild(textAndControlsWrapper);
    previewItem.appendChild(removeButton);
    imagePreviewContainer.appendChild(previewItem);
    console.log(`displayImagePreviews: ファイル ${id} (${fileName}) の画像プレビューアイテムがコンテナに追加されました。`);
}

function removeImage(idToRemove) {
    const imageFileNamesSpan = getElement('imageFileNames');
    console.log(`removeImage: ID ${idToRemove} の画像を削除します。`);
    const indexToRemove = selectedImageFiles.findIndex(img => img.id === idToRemove);

    if (indexToRemove > -1) {
        if (selectedImageFiles[indexToRemove] && selectedImageFiles[indexToRemove].previewUrl) {
            URL.revokeObjectURL(selectedImageFiles[indexToRemove].previewUrl);
        }
        selectedImageFiles.splice(indexToRemove, 1);
        displayImagePreviews(selectedImageFiles);
        updateRealtimePreview();
        if (imageFileNamesSpan) {
            imageFileNamesSpan.textContent = selectedImageFiles.length > 0 ? `${selectedImageFiles.length} 個の画像が選択されました` : '選択されていません';
        }
    }
}

function calculateImagePlacements(
    numImages,
    pageWidth,
    pageHeight,
    margin,
    imageSpacing,
    userColumns,
    imageAspectRatios,
    captionFontSizes,
    captionMarginTopBottom
) {
    const placements = [];
    const usableWidth = pageWidth - 2 * margin;
    const usableHeight = pageHeight - 2 * margin;

    let bestCols = userColumns > 0 ? userColumns : 1;
    let bestRows = Math.ceil(numImages / bestCols);

    if (userColumns === 0) {
        let currentBestArea = 0;
        for (let cols = 1; cols <= numImages; cols++) {
            const rows = Math.ceil(numImages / cols);

            const gridCellWidth = usableWidth / cols;
            const gridCellHeight = usableHeight / rows;

            const blockUsableWidth = gridCellWidth - imageSpacing;
            const blockUsableHeight = gridCellHeight - imageSpacing;

            if (blockUsableWidth <= 0 || blockUsableHeight <= 0) continue;

            let allImagesFit = true;
            const maxCaptionFontSize = Math.max(...captionFontSizes);
            const captionHeightWithSpacingForTest = maxCaptionFontSize + (captionMarginTopBottom * 2);

            for (const aspectRatio of imageAspectRatios) {
                const imageOnlyUsableHeight = blockUsableHeight - captionHeightWithSpacingForTest;
                if (imageOnlyUsableHeight <= 0) {
                    allImagesFit = false;
                    break;
                }

                let currentImgWidth = blockUsableWidth;
                let currentImgHeight = blockUsableWidth / aspectRatio;

                if (currentImgHeight > imageOnlyUsableHeight) {
                    currentImgHeight = imageOnlyUsableHeight;
                    currentImgWidth = imageOnlyUsableHeight * aspectRatio;
                }

                if (currentImgWidth > blockUsableWidth || currentImgHeight > imageOnlyUsableHeight) {
                    allImagesFit = false;
                    break;
                }
            }

            if (allImagesFit) {
                if (blockUsableWidth * blockUsableHeight > currentBestArea) {
                    currentBestArea = blockUsableWidth * blockUsableHeight;
                    bestCols = cols;
                    bestRows = rows;
                }
            }
        }
    }

    if (bestCols === 0 || bestRows === 0) {
        return null;
    }

    const gridCellWidth = usableWidth / bestCols;
    const gridCellHeight = usableHeight / bestRows;

    const blockUsableWidth = gridCellWidth - imageSpacing;
    const blockUsableHeight = gridCellHeight - imageSpacing;

    if (blockUsableWidth <= 0 || blockUsableHeight <= 0) {
        return null;
    }

    for (let i = 0; i < numImages; i++) {
        const col = i % bestCols;
        const row = Math.floor(i / bestCols);

        const aspectRatio = imageAspectRatios[i];
        const currentCaptionFontSize = captionFontSizes[i];
        const captionHeightWithSpacing = currentCaptionFontSize + (captionMarginTopBottom * 2);

        const imageOnlyUsableHeight = blockUsableHeight - captionHeightWithSpacing;

        let imgWidth = blockUsableWidth;
        let imgHeight = blockUsableWidth / aspectRatio;

        if (imgHeight > imageOnlyUsableHeight) {
            imgHeight = imageOnlyUsableHeight;
            imgWidth = imageOnlyUsableHeight * aspectRatio;
        }

        const totalBlockHeight = imgHeight + captionHeightWithSpacing;

        const blockXOffset = (blockUsableWidth - imgWidth) / 2;
        const blockYOffset = (blockUsableHeight - totalBlockHeight) / 2;

        const imageX = margin + col * gridCellWidth + blockXOffset;
        const imageY_realtime = margin + row * gridCellHeight + blockYOffset;
        const imageBottomY_pdf = pageHeight - (imageY_realtime + imgHeight);

        const captionX = imageX;
        const captionY_realtime = imageY_realtime + imgHeight + captionMarginTopBottom;
        const captionY_pdf = pageHeight - (captionY_realtime + currentCaptionFontSize);

        placements.push({
            image: {
                x: imageX,
                y_pdf: imageBottomY_pdf,
                y_realtime: imageY_realtime,
                width: imgWidth,
                height: imgHeight,
            },
            caption: {
                x: captionX,
                y_pdf: captionY_pdf,
                y_realtime: captionY_realtime,
                width: imgWidth,
                height: currentCaptionFontSize,
            }
        });
    }
    return placements;
}

function updateRealtimePreview() {
    const realtimePreviewContainer = getElement('realtimePreviewContainer');
    if (!realtimePreviewContainer) return;

    console.log('updateRealtimePreview: リアルタイムプレビュー更新関数が呼び出されました。');
    const images = realtimePreviewContainer.querySelectorAll('.realtime-preview-image');
    images.forEach(img => img.remove());

    const captions = realtimePreviewContainer.querySelectorAll('.realtime-preview-caption');
    captions.forEach(caption => caption.remove());

    const message = realtimePreviewContainer.querySelector('p');
    if (message) message.remove();

    const existingMarginGuide = realtimePreviewContainer.querySelector('.page-margin-guide');
    if (existingMarginGuide) {
        existingMarginGuide.remove();
    }

    if (selectedImageFiles.length === 0) {
        if (!selectedPdfFile) {
            realtimePreviewContainer.innerHTML = '<p>画像ファイルを選択するとここにプレビューが表示されます。</p>';
        }
        console.log('updateRealtimePreview: 画像ファイルが選択されていません。');
        return;
    }

    const previewContainerWidth = realtimePreviewContainer.clientWidth;
    const { width: pageWidth, height: pageHeight } = pdfPageSize;
    const scale = previewContainerWidth / pageWidth;

    const pageMarginNumber = getElement('pageMarginNumber');
    const imageSpacingNumber = getElement('imageSpacingNumber');
    const columnsNumber = getElement('columnsNumber');
    if (!pageMarginNumber || !imageSpacingNumber || !columnsNumber) return;

    const margin = parseInt(pageMarginNumber.value) || 0;
    const imageSpacing = parseInt(imageSpacingNumber.value) || 0;
    const userColumns = parseInt(columnsNumber.value) || 0;

    const pageMarginGuide = document.createElement('div');
    pageMarginGuide.classList.add('page-margin-guide');
    pageMarginGuide.style.left = `${margin * scale}px`;
    pageMarginGuide.style.top = `${margin * scale}px`;
    pageMarginGuide.style.width = `${(pageWidth - 2 * margin) * scale}px`;
    pageMarginGuide.style.height = `${(pageHeight - 2 * margin) * scale}px`;
    realtimePreviewContainer.appendChild(pageMarginGuide);

    const numImages = selectedImageFiles.length;
    const imageAspectRatios = selectedImageFiles.map(img => img.aspectRatio);
    const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 10);
    const captionMarginTopBottom = 5;

    const placements = calculateImagePlacements(
        numImages,
        pageWidth,
        pageHeight,
        margin,
        imageSpacing,
        userColumns,
        imageAspectRatios,
        captionFontSizes,
        captionMarginTopBottom
    );

    if (!placements) {
        realtimePreviewContainer.innerHTML = '<p>画像を配置できませんでした。オプションを調整してください。</p>';
        console.log('updateRealtimePreview: 画像配置計算失敗。');
        return;
    }

    selectedImageFiles.forEach((imageObj, i) => {
        const placement = placements[i];

        const imgElement = document.createElement('img');
        imgElement.src = imageObj.previewUrl;
        imgElement.classList.add('realtime-preview-image');
        imgElement.style.left = `${placement.image.x * scale}px`;
        imgElement.style.top = `${placement.image.y_realtime * scale}px`;
        imgElement.style.width = `${placement.image.width * scale}px`;
        imgElement.style.height = `${placement.image.height * scale}px`;
        realtimePreviewContainer.appendChild(imgElement);

        if (imageObj.caption) {
            const captionElement = document.createElement('div');
            captionElement.classList.add('realtime-preview-caption');
            captionElement.textContent = imageObj.caption;
            captionElement.style.fontSize = `${placement.caption.height * scale}px`;
            captionElement.style.left = `${(placement.image.x + placement.image.width / 2) * scale}px`;
            captionElement.style.transform = `translateX(-50%)`;
            captionElement.style.top = `${placement.caption.y_realtime * scale}px`;
            captionElement.style.width = `auto`;
            captionElement.style.textAlign = 'center';
            captionElement.style.whiteSpace = 'normal';
            captionElement.style.overflow = 'visible';
            captionElement.style.textOverflow = 'clip';
            captionElement.style.color = imageObj.captionFontColor || '#000000';
            captionElement.style.fontFamily = imageObj.captionFontFamily || 'Helvetica';
            realtimePreviewContainer.appendChild(captionElement);
        }
    });
}

async function renderPdfPageAsBackground() {
    const realtimePreviewContainer = getElement('realtimePreviewContainer');
    const pageNumberNumber = getElement('pageNumberNumber');
    if (!realtimePreviewContainer || !pageNumberNumber) return;

    if (!selectedPdfFile) {
        realtimePreviewContainer.style.backgroundImage = 'none';
        return;
    }

    try {
        const pageNumber = parseInt(pageNumberNumber.value) || 1;
        const pdfBytes = await selectedPdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;

        if (pageNumber < 1 || pageNumber > pdf.numPages) {
            return;
        }

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;

        realtimePreviewContainer.style.backgroundImage = `url(${canvas.toDataURL()})`;
        realtimePreviewContainer.style.backgroundSize = 'contain';
        realtimePreviewContainer.style.backgroundRepeat = 'no-repeat';
        realtimePreviewContainer.style.backgroundPosition = 'center';

    } catch (error) {
        console.error('PDFページのレンダリングに失敗しました:', error);
        realtimePreviewContainer.style.backgroundImage = 'none';
    }
}

// --- 各画面のイベントリスナー設定関数 ---
function setupPdfSelectListeners() {
    const pdfFile = getElement('pdfFile');
    const pdfFileNameSpan = getElement('pdfFileName');
    const nextButton = getElement('nextToImageSelect');

    if (!pdfFile || !pdfFileNameSpan || !nextButton) {
        console.warn('PDF選択画面のDOM要素が見つかりませんでした。');
        return;
    }

    pdfFile.onchange = async (event) => {
        const target = event.target;
        if (target.files && target.files.length > 0) {
            selectedPdfFile = target.files[0];
            displayPdfPreview(selectedPdfFile);
            pdfFileNameSpan.textContent = selectedPdfFile.name;
            try {
                const pdfBytes = await selectedPdfFile.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
                const pages = pdfDoc.getPages();
                pdfPageSize = pages[0].getSize(); // 最初のページのサイズを取得
            } catch (error) {
                console.error('PDFのページサイズの取得に失敗しました:', error);
                pdfPageSize = { width: 595.28, height: 841.89 }; // エラー時はデフォルト(A4)に戻す
            }
        } else {
            selectedPdfFile = null;
            pdfFileNameSpan.textContent = '選択されていません';
            pdfPageSize = { width: 595.28, height: 841.89 };
        }
    };

    nextButton.onclick = () => {
        if (selectedPdfFile) {
            window.location.hash = '/image-select';
        } else {
            alert('PDFファイルを選択してください。');
        }
    };

    // 既存のPDFファイルがあればプレビューを表示
    if (selectedPdfFile) {
        displayPdfPreview(selectedPdfFile);
        pdfFileNameSpan.textContent = selectedPdfFile.name;
    }
}

function setupImageSelectListeners() {
    const imageFilesInput = getElement('imageFiles');
    const imageFileNamesSpan = getElement('imageFileNames');
    const prevButton = getElement('prevToPdfSelect');
    const imagePreviewContainer = getElement('imagePreviewContainer');

    if (!imageFilesInput || !imageFileNamesSpan || !prevButton || !imagePreviewContainer) {
        console.warn('画像選択画面のDOM要素が見つかりませんでした。');
        return;
    }

    imageFilesInput.onchange = async (event) => {
        const target = event.target;
        if (target.files && target.files.length > 0) {
            loadingOverlay.style.display = 'flex';
            const newFiles = Array.from(target.files);
            const tempSelectedImageFiles = [];

            for (const file of newFiles) {
                let previewUrl = '';
                let pdfEmbedBytes = null;
                let pdfEmbedType = '';

                if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        const outputBuffer = await heicConvert({
                            buffer: buffer,
                            format: 'JPEG',
                            quality: 0.7
                        });
                        const previewBlob = new Blob([outputBuffer.buffer], { type: 'image/jpeg' });
                        previewUrl = URL.createObjectURL(previewBlob);

                        const pdfEmbedOutputBuffer = await heicConvert({
                            buffer: buffer,
                            format: 'JPEG',
                            quality: 0.9
                        });
                        pdfEmbedBytes = pdfEmbedOutputBuffer.buffer;
                        pdfEmbedType = 'image/jpeg';
                    } catch (error) {
                        console.error(`HEIC変換エラー: ${file.name}`, error);
                        previewUrl = URL.createObjectURL(file);
                        pdfEmbedBytes = await file.arrayBuffer();
                        pdfEmbedType = file.type;
                    }
                } else {
                    previewUrl = URL.createObjectURL(file);
                    pdfEmbedBytes = await file.arrayBuffer();
                    pdfEmbedType = file.type;
                }
                const img = new Image();
                img.src = previewUrl;
                await new Promise(resolve => img.onload = resolve);
                const aspectRatio = img.width / img.height;
                const id = Date.now() + Math.random();

                tempSelectedImageFiles.push({ id: id, file: file, previewUrl: previewUrl, pdfEmbedBytes: pdfEmbedBytes, pdfEmbedType: pdfEmbedType, aspectRatio: aspectRatio, caption: file.name, captionFontSize: 10, captionFontColor: '#000000', captionFontFamily: 'Helvetica' });
            }
            selectedImageFiles = tempSelectedImageFiles;
            displayImagePreviews(selectedImageFiles);
            updateRealtimePreview(); // リアルタイムプレビューを更新
            imageFileNamesSpan.textContent = `${selectedImageFiles.length} 個の画像が選択されました`;
            loadingOverlay.style.display = 'none';
        } else {
            selectedImageFiles = [];
            displayImagePreviews(selectedImageFiles);
            imageFileNamesSpan.textContent = '選択されていません';
            loadingOverlay.style.display = 'none';
        }
    };

    prevButton.onclick = () => {
        window.location.hash = '/pdf-select';
    };

    // 既存の画像があればプレビューを表示
    displayImagePreviews(selectedImageFiles);
    if (imageFileNamesSpan) {
        imageFileNamesSpan.textContent = selectedImageFiles.length > 0 ? `${selectedImageFiles.length} 個の画像が選択されました` : '選択されていません';
    }

    // SortableJSの初期化
    new Sortable(imagePreviewContainer, {
        animation: 200,
        ghostClass: 'sortable-ghost',
        handle: '.drag-handle',
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;

            const [movedItem] = selectedImageFiles.splice(oldIndex, 1);
            selectedImageFiles.splice(newIndex, 0, movedItem);

            updateRealtimePreview();
            console.log('画像の順序が更新されました:', selectedImageFiles.map(img => img.file.name));
        }
    });
}

async function setupOptionsListeners() {
    const embedButton = getElement('embedButton');
    const pageMarginSlider = getElement('pageMarginSlider');
    const pageMarginNumber = getElement('pageMarginNumber');
    const imageSpacingSlider = getElement('imageSpacingSlider');
    const imageSpacingNumber = getElement('imageSpacingNumber');
    const columnsSlider = getElement('columnsSlider');
    const columnsNumber = getElement('columnsNumber');
    const pageNumberSlider = getElement('pageNumberSlider');
    const pageNumberNumber = getElement('pageNumberNumber');
    const realtimePreviewContainer = getElement('realtimePreviewContainer');

    if (!embedButton || !pageMarginSlider || !pageMarginNumber ||
        !imageSpacingSlider || !imageSpacingNumber || !columnsSlider || !columnsNumber ||
        !pageNumberSlider || !pageNumberNumber || !realtimePreviewContainer) {
        console.warn('オプション設定画面のDOM要素が見つかりませんでした。');
        return;
    }

    function syncInputs(slider, numberInput) {
        slider.value = numberInput.value;
    }

    pageMarginSlider.oninput = () => {
        pageMarginNumber.value = pageMarginSlider.value;
        updateRealtimePreview();
    };
    imageSpacingSlider.oninput = () => {
        imageSpacingNumber.value = imageSpacingSlider.value;
        updateRealtimePreview();
    };
    columnsSlider.oninput = () => {
        columnsNumber.value = columnsSlider.value;
        updateRealtimePreview();
    };
    pageNumberSlider.oninput = () => {
        pageNumberNumber.value = pageNumberSlider.value;
        updateRealtimePreview();
        renderPdfPageAsBackground();
    };

    pageMarginNumber.oninput = () => {
        syncInputs(pageMarginSlider, pageMarginNumber);
        updateRealtimePreview();
    };
    imageSpacingNumber.oninput = () => {
        syncInputs(imageSpacingSlider, imageSpacingNumber);
        updateRealtimePreview();
    };
    columnsNumber.oninput = () => {
        syncInputs(columnsSlider, columnsNumber);
        updateRealtimePreview();
    };
    pageNumberNumber.oninput = () => {
        syncInputs(pageNumberSlider, pageNumberNumber);
        updateRealtimePreview();
        renderPdfPageAsBackground();
    };

    embedButton.onclick = async () => {
        if (!selectedPdfFile || selectedImageFiles.length === 0) {
            alert('PDFファイルと画像ファイルを選択してください。');
            return;
        }

        loadingOverlay.style.display = 'flex';

        try {
            const pdfBytes = await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            const pageNumber = parseInt(pageNumberNumber.value) || 1;
            if (pageNumber < 1 || pageNumber > pages.length) {
                alert(`無効なページ番号です。1から${pages.length}の間で指定してください。`);
                loadingOverlay.style.display = 'none';
                return;
            }
            const targetPage = pages[pageNumber - 1];

            const { width: pageWidth, height: pageHeight } = targetPage.getSize();

            const margin = parseInt(pageMarginNumber.value) || 0;
            const imageSpacing = parseInt(imageSpacingNumber.value) || 0;
            const userColumns = parseInt(columnsNumber.value) || 0;

            const embeddedImages = [];
            for (const imageObj of selectedImageFiles) {
                let image;
                if (imageObj.pdfEmbedType === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imageObj.pdfEmbedBytes);
                } else if (imageObj.pdfEmbedType === 'image/png') {
                    image = await pdfDoc.embedPng(imageObj.pdfEmbedBytes);
                } else {
                    alert(`サポートされていない画像形式です: ${imageObj.file.name} (JPEG, PNG, HEICのみ)`);
                    loadingOverlay.style.display = 'none';
                    return;
                }
                embeddedImages.push(image);
            }

            const numImages = embeddedImages.length;
            const imageAspectRatios = embeddedImages.map(img => img.width / img.height);
            const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 10);
            const captionMarginTopBottom = 5;

            const placements = calculateImagePlacements(
                numImages,
                pageWidth,
                pageHeight,
                margin,
                imageSpacing,
                userColumns,
                imageAspectRatios,
                captionFontSizes,
                captionMarginTopBottom
            );

            if (!placements) {
                alert('画像をページに配置できませんでした。オプションを調整してください。');
                loadingOverlay.style.display = 'none';
                return;
            }

            for (let i = 0; i < numImages; i++) {
                const image = embeddedImages[i];
                const placement = placements[i];

                targetPage.drawImage(image, {
                    x: placement.image.x,
                    y: placement.image.y_pdf,
                    width: placement.image.width,
                    height: placement.image.height,
                });

                if (selectedImageFiles[i].caption) {
                    const captionText = selectedImageFiles[i].caption;
                    const fontSize = selectedImageFiles[i].captionFontSize || 10;

                    let font;
                    const fontFamily = selectedImageFiles[i].captionFontFamily;
                    
                    if (!fontCache[fontFamily]) {
                        if (fontFamily === 'NotoSansJP') {
                            try {
                                const fontBytes = await fetch('fonts/NotoSansJP-Regular.ttf').then(res => res.arrayBuffer());
                                fontCache[fontFamily] = await pdfDoc.embedFont(fontBytes);
                            } catch (error) {
                                console.error('NotoSansJPフォントの埋め込みに失敗しました。Helveticaにフォールバックします。', error);
                                fontCache[fontFamily] = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
                            }
                        } else {
                            fontCache[fontFamily] = await pdfDoc.embedFont(PDFLib.StandardFonts[fontFamily] || PDFLib.StandardFonts.Helvetica);
                        }
                    }
                    font = fontCache[fontFamily];

                    const hexColor = selectedImageFiles[i].captionFontColor || '#000000';
                    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
                    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
                    const b = parseInt(hexColor.slice(5, 7), 16) / 255;
                    const fontColor = PDFLib.rgb(r, g, b);

                    let textWidth = font.widthOfTextAtSize(captionText, fontSize);
                    const centeredCaptionX = placement.caption.x + (placement.caption.width / 2) - (textWidth / 2);

                    targetPage.drawText(captionText, {
                        x: centeredCaptionX,
                        y: placement.caption.y_pdf,
                        font: font,
                        size: fontSize,
                        color: fontColor,
                    });
                }
            }

            processedPdfBytes = await pdfDoc.save(); // 処理済みPDFを保存
            window.location.hash = '/result'; // 結果画面へ遷移
        } catch (error) {
            console.error('Error during PDF processing:', error);
            alert('PDF処理中にエラーが発生しました。');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    };

    // 初期表示
    updateRealtimePreview();
    if (selectedPdfFile) {
        // PDFのページサイズを取得してプレビューに反映
        try {
            const pdfBytes = await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();
            pageNumberSlider.max = pages.length;
            pageNumberNumber.max = pages.length;
            pageNumberSlider.value = 1;
            pageNumberNumber.value = 1;
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            pdfPageSize = { width, height };
            realtimePreviewContainer.style.aspectRatio = `${width} / ${height}`;
            renderPdfPageAsBackground();
            updateRealtimePreview();
        } catch (error) {
            console.error('PDFのページサイズの取得に失敗しました:', error);
            pdfPageSize = { width: 595.28, height: 841.89 };
            realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
            updateRealtimePreview();
        }
    } else {
        realtimePreviewContainer.style.backgroundImage = 'none';
        realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
    }
}

function setupResultListeners() {
    const restartButton = getElement('restartApp');
    if (!restartButton) {
        console.warn('結果画面のDOM要素が見つかりませんでした。');
        return;
    }

    restartButton.onclick = () => {
        // 状態をリセットして最初の画面に戻る
        selectedPdfFile = null;
        selectedImageFiles = [];
        processedPdfBytes = null;
        window.location.hash = '/pdf-select';
    };

    // 処理済みPDFがあればプレビューを表示
    if (processedPdfBytes) {
        displayProcessedPdfPreview(processedPdfBytes);
    } else {
        // 直接結果画面に来た場合など、エラーメッセージを表示
        const pdfPreviewContainer = getElement('pdfPreviewContainer');
        const downloadLink = getElement('downloadLink');
        if (pdfPreviewContainer) {
            pdfPreviewContainer.innerHTML = '<p>処理されたPDFがありません。</p>';
        }
        if (downloadLink) {
            downloadLink.style.display = 'none';
        }
    }
}

function setupPanelResizer() {
    const resizer = getElement('panel-resizer');
    const panel = getElement('options-sidebar-panel');
    if (!resizer || !panel) return;

    const handleMouseDown = (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        const newHeight = window.innerHeight - e.clientY;
        const minHeight = 100; // パネルの最小高さ
        const maxHeight = window.innerHeight * 0.8; // パネルの最大高さ
        if (newHeight > minHeight && newHeight < maxHeight) {
            panel.style.height = `${newHeight}px`;
        }
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    resizer.addEventListener('mousedown', handleMouseDown);
}

// --- SPA ルーティングとビューの定義 ---

const routes = {
    '/': {
        title: 'PCレポート作成 - PDF選択',
        className: 'page-pdf-select',
        render: () => `
            <h1>PDFファイルを選択</h1>
            <div class="input-group">
                <label for="pdfFile" class="btn btn-border"><span>PDFファイルを選択</span></label>
                <input type="file" id="pdfFile" accept="application/pdf" style="display: none;">
                <span id="pdfFileName" class="file-name">選択されていません</span>
            </div>
            <h2>PDFプレビュー</h2>
            <div id="pdfPreviewContainer">
                <p>PDFファイルを選択するとここにプレビューが表示されます。</p>
            </div>
            <div class="btn-wrap">
                <a id="nextToImageSelect" class="btn btn-stripe"><span>次へ (画像選択)</span></a>
            </div>
        `,
        onMount: setupPdfSelectListeners
    },
    '/pdf-select': { // '/' と同じ内容だが、明示的なパスとして定義
        title: 'PCレポート作成 - PDF選択',
        className: 'page-pdf-select',
        render: () => `
            <h1>PDFファイルを選択</h1>
            <div class="input-group">
                <label for="pdfFile" class="btn btn-border"><span>PDFファイルを選択</span></label>
                <input type="file" id="pdfFile" accept="application/pdf" style="display: none;">
                <span id="pdfFileName" class="file-name">選択されていません</span>
            </div>
            <h2>PDFプレビュー</h2>
            <div id="pdfPreviewContainer">
                <p>PDFファイルを選択するとここにプレビューが表示されます。</p>
            </div>
            <div class="btn-wrap">
                <a id="nextToImageSelect" class="btn btn-stripe"><span>次へ (画像選択)</span></a>
            </div>
        `,
        onMount: setupPdfSelectListeners
    },
    '/image-select': {
        title: 'PCレポート作成 - 画像配置',
        className: 'page-image-select',
        render: () => `
            <div class="image-select-layout">
                <div class="options-sidebar" id="options-sidebar-panel">
                    <div class="panel-resizer" id="panel-resizer"></div>
                    <h1>画像配置</h1>
                    <div class="input-group">
                        <label for="imageFiles" class="btn btn-border"><span>画像ファイルを選択 (複数選択可)</span></label>
                        <input type="file" id="imageFiles" accept="image/*" multiple style="display: none;">
                        <span id="imageFileNames" class="file-name">選択されていません</span>
                    </div>
					<details class="accordion">
    					<summary>画像一覧</summary>
						<div id="imagePreviewContainer" class="image-preview-container sortable-list">
							<p>画像ファイルを選択するとここにプレビューが表示されます。</p>
						</div>
					</details>
					<details class="accordion options-group">
    					<summary>配置オプション</summary>
						<div class="accordion-content">
							<div class="inputs-wrapper">
								<label for="pageMarginNumber">ページマージン (pt):</label>
								<div class="input-controls">
									<input type="range" id="pageMarginSlider" value="20" min="0" max="100" step="1">
									<input type="number" id="pageMarginNumber" value="20" min="0" max="100">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="imageSpacingNumber">画像間のスペース (pt):</label>
								<div class="input-controls">
									<input type="range" id="imageSpacingSlider" value="10" min="0" max="50" step="1">
									<input type="number" id="imageSpacingNumber" value="10" min="0" max="50">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="columnsNumber">列数 (0で自動):</label>
								<div class="input-controls">
									<input type="range" id="columnsSlider" value="0" min="0" max="5" step="1">
									<input type="number" id="columnsNumber" value="0" min="0" max="5">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="pageNumberNumber">貼り付けページ番号:</label>
								<div class="input-controls">
									<input type="range" id="pageNumberSlider" value="1" min="1" max="1" step="1">
							<input type="number" id="pageNumberNumber" value="1" min="1">
								</div>
							</div>
						</div>
                    </details>
                </div>
                <div class="preview-main">
                    <button class="sidebar-toggle" id="sidebar-toggle">
                        <span class="bar"></span>
                        <span class="bar"></span>
                        <span class="bar"></span>
                    </button>
                    <h2>画像配置プレビュー</h2>
                    <div id="realtimePreviewContainer" class="realtime-preview-container">
                        <p>配置オプションを変更するとここにプレビューが表示されます。</p>
                    </div>
                    <div class="btn-wrap">
                        <a id="prevToPdfSelect" class="btn btn-stripe"><span>前へ (PDF選択)</span></a>
                        <a id="embedButton" class="btn btn-stripe"><span>画像をPDFに貼り付け</span></a>
                    </div>
                </div>
            </div>
        `,
        onMount: () => {
            setupImageSelectListeners();
            setupOptionsListeners();
            setupPanelResizer();

            const sidebarToggle = getElement('sidebar-toggle');
            const optionsSidebar = getElement('options-sidebar-panel');
            const previewMain = document.querySelector('.preview-main');

            if (sidebarToggle && optionsSidebar && previewMain) {
                // 初期表示でサイドバーをアクティブにする
                sidebarToggle.classList.add('active');
                optionsSidebar.classList.add('active');
                previewMain.classList.add('sidebar-active');

                sidebarToggle.addEventListener('click', () => {
                    sidebarToggle.classList.toggle('active');
                    optionsSidebar.classList.toggle('active');
                    previewMain.classList.toggle('sidebar-active');
                });
            }
        }
    },
    '/result': {
        title: 'PCレポート作成 - 結果',
        className: 'page-result',
        render: () => `
            <h1>PDF処理結果</h1>
            <h2>PDFプレビュー</h2>
            <div id="pdfPreviewContainer">
                <p>PDFファイルを選択するとここにプレビューが表示されます。</p>
            </div>
            <div class="btn-wrap">
                <a id="downloadLink" class="btn btn-stripe" style="display:none;"><span>ダウンロード</span></a>
                <a id="restartApp" class="btn btn-stripe"><span>最初からやり直す</span></a>
            </div>
        `,
        onMount: setupResultListeners
    },
    '/about': {
        title: 'このアプリについて',
        className: 'page-about',
        render: () => `
            <h1>このアプリについて</h1>
            <p>このアプリケーションは、PDFファイルに複数の画像を貼り付けるためのツールです。</p>
            <p>画像の位置、サイズ、キャプションなどを調整して、オリジナルのPDFを作成できます。</p>
            <p>HEIC/HEIF形式の画像も自動的にJPEGに変換して処理します。</p>
        `,
        onMount: () => {
            // 特に初期化するイベントリスナーはない
        }
    }
};

const router = () => {
    const path = window.location.hash.slice(1) || '/';
    const route = routes[path];

    // 既存のクラスをクリア
    app.className = '';

    if (route) {
        document.title = route.title;
        // 新しいクラスを追加
        if (route.className) {
            app.classList.add(route.className);
        }
        app.innerHTML = route.render();
        route.onMount(); // ビューがDOMに追加された後にイベントリスナーを設定
    } else {
        document.title = '404 Not Found';
        app.innerHTML = '<h1>404 Not Found</h1><p>お探しのページは見つかりませんでした。</p>';
    }
};

// 初期ロード時とハッシュ変更時にルーターを実行
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
    router();

    const hamburgerMenu = getElement('hamburger-menu');
    const mainNav = getElement('main-nav');

    if (hamburgerMenu && mainNav) {
        hamburgerMenu.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            hamburgerMenu.classList.toggle('active');
        });

        // ナビゲーションリンクがクリックされたらメニューを閉じる
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                hamburgerMenu.classList.remove('active');
            });
        });
    }

    // ナビゲーションリンクにイベントリスナーを追加 (既存のロジック)
    const navHome = getElement('nav-home');
    const navAbout = getElement('nav-about');
    if (navHome) {
        navHome.addEventListener('click', () => {
            window.location.hash = '/';
        });
    }
    if (navAbout) {
        navAbout.addEventListener('click', () => {
            window.location.hash = '/about';
        });
    }
});

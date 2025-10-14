import heicConvert from 'heic-convert';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'url:pdfjs-dist/build/pdf.worker.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const fontCache = {}; // フォントキャッシュを定義

// We know these elements exist because they are defined in index.html
const pdfFile = document.getElementById('pdfFile');
const imageFilesInput = document.getElementById('imageFiles'); // 複数画像ファイル入力
const embedButton = document.getElementById('embedButton');
const downloadLink = document.getElementById('downloadLink');
const pdfPreviewContainer = document.getElementById('pdfPreviewContainer');
const imagePreviewContainer = document.getElementById('imagePreviewContainer'); // 画像プレビューコンテナ
const pdfFileNameSpan = document.getElementById('pdfFileName');
const imageFileNamesSpan = document.getElementById('imageFileNames'); // 複数画像ファイル名表示
const loadingOverlay = document.getElementById('loadingOverlay');
const pageMarginSlider = document.getElementById('pageMarginSlider');
const pageMarginNumber = document.getElementById('pageMarginNumber');
const imageSpacingSlider = document.getElementById('imageSpacingSlider');
const imageSpacingNumber = document.getElementById('imageSpacingNumber');
const columnsSlider = document.getElementById('columnsSlider');
const columnsNumber = document.getElementById('columnsNumber');
const pageNumberSlider = document.getElementById('pageNumberSlider');
const pageNumberNumber = document.getElementById('pageNumberNumber');
const realtimePreviewContainer = document.getElementById('realtimePreviewContainer'); // リアルタイムプレビューコンテナ

let selectedPdfFile = null;
let pdfPageSize = { width: 595.28, height: 841.89 }; // A4のデフォルト値(pt)
// selectedImageFilesをファイルオブジェクト、プレビュー用データURL、PDF埋め込み用データとタイプ、アスペクト比のペアの配列に変更
let selectedImageFiles = []; // [{ file: File, previewUrl: string, pdfEmbedBytes: ArrayBuffer, pdfEmbedType: string, aspectRatio: number }]
// Function to display PDF preview
function displayPdfPreview(file) {
    if (!file) {
        pdfPreviewContainer.innerHTML = '<p>PDFファイルを選択してください。</p>';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        if (e.target && e.target.result) {
            const pdfUrl = URL.createObjectURL(file);
            // Adjust preview height dynamically based on viewport height
            // Subtracting some margin for header, controls, etc.
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
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    // Adjust preview height dynamically based on viewport height
    const viewportHeight = window.innerHeight - 250;
    pdfPreviewContainer.innerHTML = `
        <embed src="${url}" type="application/pdf" width="100%" height="${viewportHeight}px" />
    `;
    // Make download link visible
    downloadLink.href = url;
    downloadLink.download = 'modified.pdf';
    downloadLink.style.display = 'block';
}

// Function to display image previews
function displayImagePreviews(imageFileObjects) {
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

    // キャプション入力欄のグループ
    const captionInputGroup = document.createElement('div');
    captionInputGroup.classList.add('inputs-wrapper', 'caption-input-group'); // 新しいクラス名

    // キャプション入力欄のラベル
    const captionLabel = document.createElement('label');
    captionLabel.textContent = 'キャプション:';
    captionLabel.htmlFor = `caption-input-${id}`; // inputと関連付けるためのfor属性
    captionInputGroup.appendChild(captionLabel); // グループに追加

    const captionInput = document.createElement('input');
    captionInput.type = 'text';
    captionInput.id = `caption-input-${id}`; // labelと関連付けるためのid属性
    captionInput.classList.add('image-caption-input');
    captionInput.placeholder = 'キャプションを入力';
    captionInputGroup.appendChild(captionInput); // グループに追加

    // 既存のキャプションがあれば設定
    const imageObj = selectedImageFiles.find(item => item.id === id);
    if (imageObj && imageObj.caption !== undefined) { // undefinedチェックを追加
        captionInput.value = imageObj.caption;
    } else {
        captionInput.value = fileName; // 初期値をファイル名に設定
        if (imageObj) imageObj.caption = fileName; // selectedImageFilesにも設定
    }
    captionInput.addEventListener('input', (event) => {
        const targetImage = selectedImageFiles.find(item => item.id === id);
        if (targetImage) {
            targetImage.caption = event.target.value;
            updateRealtimePreview(); // キャプション変更時にリアルタイムプレビューを更新
        }
    });

    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-image-btn');
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', () => {
        removeImage(id); // dataset.idで削除
    });

    // キャプションフォントサイズ調整用のスライダーと数値入力
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

    // スライダーと数値入力の同期
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

    // キャプション入力欄とフォントサイズ調整要素をまとめる新しいラッパー
    const textAndControlsWrapper = document.createElement('div');
    textAndControlsWrapper.classList.add('inputs-wrapper', 'image-caption-controls-wrapper'); // 汎用的なクラス名に変更
    textAndControlsWrapper.appendChild(captionInputGroup); // 新しいグループを追加
    textAndControlsWrapper.appendChild(captionFontSizeWrapper); // フォントサイズ調整UI

    // フォントカラー選択
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

    // フォントファミリー選択
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
        { value: 'NotoSansJP', text: 'Noto Sans JP' } // 日本語フォントを追加
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
    previewItem.appendChild(img); // 画像を直接追加
    previewItem.appendChild(textAndControlsWrapper); // 新しいラッパーを追加
    previewItem.appendChild(removeButton);
    imagePreviewContainer.appendChild(previewItem);
    console.log(`displayImagePreviews: ファイル ${id} (${fileName}) の画像プレビューアイテムがコンテナに追加されました。`);
}

function removeImage(idToRemove) {
    console.log(`removeImage: ID ${idToRemove} の画像を削除します。`);
    const indexToRemove = selectedImageFiles.findIndex(img => img.id === idToRemove);

    if (indexToRemove > -1) {
        // URL.revokeObjectURLで以前作成したプレビュー用URLを解放
        if (selectedImageFiles[indexToRemove] && selectedImageFiles[indexToRemove].previewUrl) {
            URL.revokeObjectURL(selectedImageFiles[indexToRemove].previewUrl);
        }
        selectedImageFiles.splice(indexToRemove, 1); // 配列から削除
        displayImagePreviews(selectedImageFiles); // プレビューを再描画
        updateRealtimePreview(); // リアルタイムプレビューも更新
        if (imageFileNamesSpan) {
            imageFileNamesSpan.textContent = selectedImageFiles.length > 0 ? `${selectedImageFiles.length} 個の画像が選択されました` : '選択されていません';
        }
    }
}

// 画像とキャプションの配置を計算する共通関数
function calculateImagePlacements(
    numImages,
    pageWidth,
    pageHeight,
    margin,
    imageSpacing,
    userColumns,
    imageAspectRatios,
    captionFontSizes, // captionFontSizeを配列に変更
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
            // 最も大きいキャプションフォントサイズを仮定して計算
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
        return null; // 配置失敗
    }

    const gridCellWidth = usableWidth / bestCols;
    const gridCellHeight = usableHeight / bestRows;

    const blockUsableWidth = gridCellWidth - imageSpacing;
    const blockUsableHeight = gridCellHeight - imageSpacing;

    if (blockUsableWidth <= 0 || blockUsableHeight <= 0) {
        return null; // 配置失敗
    }

    for (let i = 0; i < numImages; i++) {
        const col = i % bestCols;
        const row = Math.floor(i / bestCols);

        const aspectRatio = imageAspectRatios[i];
        const currentCaptionFontSize = captionFontSizes[i]; // 各画像のフォントサイズを取得
        const captionHeightWithSpacing = currentCaptionFontSize + (captionMarginTopBottom * 2); // 各画像のキャプション高さを計算

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
        // リアルタイムプレビューのY座標 (上からの距離)
        const imageY_realtime = margin + row * gridCellHeight + blockYOffset;
        // PDF座標系での画像の下端のY座標 (下からの距離)
        const imageBottomY_pdf = pageHeight - (imageY_realtime + imgHeight);

        const captionX = imageX;
        // リアルタイムプレビューのキャプションのY座標 (上からの距離)
        const captionY_realtime = imageY_realtime + imgHeight + captionMarginTopBottom;
        // PDF座標系でのキャプションのY座標 (下からの距離)
        const captionY_pdf = pageHeight - (captionY_realtime + currentCaptionFontSize); // 各画像のフォントサイズを使用

        placements.push({
            image: {
                x: imageX,
                y_pdf: imageBottomY_pdf, // PDF埋め込み用
                y_realtime: imageY_realtime, // リアルタイムプレビュー用
                width: imgWidth,
                height: imgHeight,
            },
            caption: {
                x: captionX, // 画像と同じX座標
                y_pdf: captionY_pdf,
                y_realtime: captionY_realtime,
                width: imgWidth, // 画像と同じ幅
                height: currentCaptionFontSize, // 各画像のフォントサイズを使用
            }
        });
    }
    return placements;
}

// リアルタイムプレビューを更新する関数
function updateRealtimePreview() {
    console.log('updateRealtimePreview: リアルタイムプレビュー更新関数が呼び出されました。');
    // 画像要素をクリア
    const images = realtimePreviewContainer.querySelectorAll('.realtime-preview-image');
    images.forEach(img => img.remove());

    // キャプション要素をクリア
    const captions = realtimePreviewContainer.querySelectorAll('.realtime-preview-caption');
    captions.forEach(caption => caption.remove());

    // テキストメッセージをクリア
    const message = realtimePreviewContainer.querySelector('p');
    if (message) message.remove();

    // 既存のページマージンガイドをクリア
    const existingMarginGuide = realtimePreviewContainer.querySelector('.page-margin-guide');
    if (existingMarginGuide) {
        existingMarginGuide.remove();
    }

    if (selectedImageFiles.length === 0) {
        // PDFが選択されておらず、画像もない場合のみメッセージを表示
        if (!selectedPdfFile) {
            realtimePreviewContainer.innerHTML = '<p>画像ファイルを選択するとここにプレビューが表示されます。</p>';
        }
        console.log('updateRealtimePreview: 画像ファイルが選択されていません。');
        return;
    }

    // プレビューコンテナの実際の表示幅を取得
    const previewContainerWidth = realtimePreviewContainer.clientWidth;

    // 選択されたPDFのページサイズを使用
    const { width: pageWidth, height: pageHeight } = pdfPageSize;

    // ページ幅とコンテナ幅からスケーリング係数を計算
    const scale = previewContainerWidth / pageWidth;

    // ユーザー設定オプションの取得
    const margin = parseInt(pageMarginNumber.value) || 0;
    const imageSpacing = parseInt(imageSpacingNumber.value) || 0;
    const userColumns = parseInt(columnsNumber.value) || 0;

    // ページマージンガイドの追加
    const pageMarginGuide = document.createElement('div');
    pageMarginGuide.classList.add('page-margin-guide');
    pageMarginGuide.style.left = `${margin * scale}px`;
    pageMarginGuide.style.top = `${margin * scale}px`;
    pageMarginGuide.style.width = `${(pageWidth - 2 * margin) * scale}px`;
    pageMarginGuide.style.height = `${(pageHeight - 2 * margin) * scale}px`;
    realtimePreviewContainer.appendChild(pageMarginGuide);

    const numImages = selectedImageFiles.length;
    const imageAspectRatios = selectedImageFiles.map(img => img.aspectRatio);
    const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 10); // 各画像のフォントサイズを取得、デフォルトは10
    const captionMarginTopBottom = 5; // キャプションの上下マージン

    const placements = calculateImagePlacements(
        numImages,
        pageWidth,
        pageHeight,
        margin,
        imageSpacing,
        userColumns,
        imageAspectRatios,
        captionFontSizes, // 配列を渡す
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
        // スケーリング係数を適用して表示
        imgElement.style.left = `${placement.image.x * scale}px`;
        imgElement.style.top = `${placement.image.y_realtime * scale}px`;
        imgElement.style.width = `${placement.image.width * scale}px`;
        imgElement.style.height = `${placement.image.height * scale}px`;
        realtimePreviewContainer.appendChild(imgElement);

        // キャプションのプレビュー
        if (imageObj.caption) {
            const captionElement = document.createElement('div');
            captionElement.classList.add('realtime-preview-caption');
            captionElement.textContent = imageObj.caption;
            captionElement.style.fontSize = `${placement.caption.height * scale}px`;
            // キャプションは画像の中央に配置され、左右均等にはみ出すように調整
            captionElement.style.left = `${(placement.image.x + placement.image.width / 2) * scale}px`; // 画像の中心のX座標
            captionElement.style.transform = `translateX(-50%)`; // 要素自体の幅を考慮して中央寄せ
            captionElement.style.top = `${placement.caption.y_realtime * scale}px`;
            captionElement.style.width = `auto`; // 幅は内容に応じて自動調整
            captionElement.style.textAlign = 'center';
            captionElement.style.whiteSpace = 'normal'; // キャプションが横幅を超えて表示されるように
            captionElement.style.overflow = 'visible'; // テキストが切り捨てられないように
            captionElement.style.textOverflow = 'clip'; // テキストが切り捨てられないように
            captionElement.style.color = imageObj.captionFontColor || '#000000'; // フォントカラーを適用
            captionElement.style.fontFamily = imageObj.captionFontFamily || 'Helvetica'; // フォントファミリーを適用
            realtimePreviewContainer.appendChild(captionElement);
        }
    });
}

// PDFの指定ページをレンダリングしてプレビューの背景に設定する関数
async function renderPdfPageAsBackground() {
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
            return; // 無効なページ
        }

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.5 }); // 少し高解像度でレンダリング

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

document.addEventListener('DOMContentLoaded', () => {
    // スライダーと数値入力の同期関数
    function syncInputs(slider, numberInput) {
        slider.value = numberInput.value;
    }

    // スライダーの変更を数値入力に反映
    pageMarginSlider.addEventListener('input', () => {
        pageMarginNumber.value = pageMarginSlider.value;
        updateRealtimePreview();
    });
    imageSpacingSlider.addEventListener('input', () => {
        imageSpacingNumber.value = imageSpacingSlider.value;
        updateRealtimePreview();
    });
    columnsSlider.addEventListener('input', () => {
        columnsNumber.value = columnsSlider.value;
        updateRealtimePreview();
    });
    pageNumberSlider.addEventListener('input', () => {
        pageNumberNumber.value = pageNumberSlider.value;
        updateRealtimePreview();
        renderPdfPageAsBackground(); // ページ番号変更時に背景も更新
    });

    // 数値入力の変更をスライダーに反映
    pageMarginNumber.addEventListener('input', () => {
        syncInputs(pageMarginSlider, pageMarginNumber);
        updateRealtimePreview();
    });
    imageSpacingNumber.addEventListener('input', () => {
        syncInputs(imageSpacingSlider, imageSpacingNumber);
        updateRealtimePreview();
    });
    columnsNumber.addEventListener('input', () => {
        syncInputs(columnsSlider, columnsNumber);
        updateRealtimePreview();
    });
    pageNumberNumber.addEventListener('input', () => {
        syncInputs(pageNumberSlider, pageNumberNumber);
        updateRealtimePreview();
        renderPdfPageAsBackground(); // ページ番号変更時に背景も更新
    });

    pdfFile.addEventListener('change', async (event) => {
        const target = event.target;
        if (target.files && target.files.length > 0) {
            selectedPdfFile = target.files[0];
            displayPdfPreview(selectedPdfFile);
            if (pdfFileNameSpan) {
                pdfFileNameSpan.textContent = selectedPdfFile.name;
            }
            // PDFのページサイズを取得してプレビューに反映
            try {
                const pdfBytes = await selectedPdfFile.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
                const pages = pdfDoc.getPages();
                
                // ページ番号スライダーと数値入力の最大値を設定
                pageNumberSlider.max = pages.length;
                pageNumberNumber.max = pages.length;
                pageNumberSlider.value = 1; // PDFを変更したら1ページ目に戻す
                pageNumberNumber.value = 1; // PDFを変更したら1ページ目に戻す

                const firstPage = pages[0];
                const { width, height } = firstPage.getSize();
                pdfPageSize = { width, height };
                realtimePreviewContainer.style.aspectRatio = `${width} / ${height}`;
                await renderPdfPageAsBackground(); // 背景を描画
                updateRealtimePreview(); // ページサイズを更新したのでプレビューも更新
            } catch (error) {
                console.error('PDFのページサイズの取得に失敗しました:', error);
                // エラー時はデフォルト(A4)に戻す
                pdfPageSize = { width: 595.28, height: 841.89 };
                realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
                updateRealtimePreview();
            }
        } else {
            selectedPdfFile = null;
            if (pdfFileNameSpan) {
                pdfFileNameSpan.textContent = '選択されていません';
            }
            // PDFが選択解除されたらデフォルト(A4)に戻し、背景をクリア
            pdfPageSize = { width: 595.28, height: 841.89 };
            realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
            realtimePreviewContainer.style.backgroundImage = 'none';
            updateRealtimePreview();
        }
    });

    imageFilesInput.addEventListener('change', async (event) => {
        const target = event.target;
        if (target.files && target.files.length > 0) {
            loadingOverlay.style.display = 'flex'; // ローディングオーバーレイを表示
            const newFiles = Array.from(target.files);
            const tempSelectedImageFiles = []; // 一時的な配列で処理

            for (const file of newFiles) {
                let previewUrl = '';
                let pdfEmbedBytes = null;
                let pdfEmbedType = '';

                // HEIC/HEIFファイルの処理
                if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
                    try {
                        const arrayBuffer = await file.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);
                        const outputBuffer = await heicConvert({
                            buffer: buffer,
                            format: 'JPEG',
                            quality: 0.7 // プレビュー用に品質を少し下げる
                        });
                        const previewBlob = new Blob([outputBuffer.buffer], { type: 'image/jpeg' });
                        previewUrl = URL.createObjectURL(previewBlob);

                        // PDF埋め込み用は高画質で変換
                        const pdfEmbedOutputBuffer = await heicConvert({
                            buffer: buffer,
                            format: 'JPEG',
                            quality: 0.9
                        });
                        pdfEmbedBytes = pdfEmbedOutputBuffer.buffer;
                        pdfEmbedType = 'image/jpeg';
                    } catch (error) {
                        console.error(`HEIC変換エラー: ${file.name}`, error);
                        // 変換失敗時は元のファイルで試す（プレビューは表示されない可能性あり）
                        previewUrl = URL.createObjectURL(file);
                        pdfEmbedBytes = await file.arrayBuffer();
                        pdfEmbedType = file.type;
                    }
                } else {
                    // その他の画像形式
                    previewUrl = URL.createObjectURL(file);
                    pdfEmbedBytes = await file.arrayBuffer();
                    pdfEmbedType = file.type;
                }
                // 画像のアスペクト比を取得
                const img = new Image();
                img.src = previewUrl;
                await new Promise(resolve => img.onload = resolve);
                const aspectRatio = img.width / img.height;
                const id = Date.now() + Math.random(); // ユニークなIDを生成

                tempSelectedImageFiles.push({ id: id, file: file, previewUrl: previewUrl, pdfEmbedBytes: pdfEmbedBytes, pdfEmbedType: pdfEmbedType, aspectRatio: aspectRatio, caption: file.name, captionFontSize: 10, captionFontColor: '#000000', captionFontFamily: 'Helvetica' }); // captionの初期値をファイル名に設定, captionFontSize, captionFontColor, captionFontFamilyの初期値を追加
            }
            selectedImageFiles = tempSelectedImageFiles; // 処理後に置き換え
            displayImagePreviews(selectedImageFiles); // 置き換え後に呼び出す
            if (imageFileNamesSpan) {
                imageFileNamesSpan.textContent = `${selectedImageFiles.length} 個の画像が選択されました`;
            }
            loadingOverlay.style.display = 'none'; // ローディングオーバーレイを非表示
            updateRealtimePreview(); // 画像が選択された後にリアルタイムプレビューを更新
        } else {
            selectedImageFiles = [];
            displayImagePreviews(selectedImageFiles);
            if (imageFileNamesSpan) {
                imageFileNamesSpan.textContent = '選択されていません';
            }
            loadingOverlay.style.display = 'none'; // ローディングオーバーレイを非表示
            updateRealtimePreview(); // 画像がクリアされた後にリアルタイムプレビューを更新
        }
    });

    embedButton.addEventListener('click', async () => {
        if (!selectedPdfFile || selectedImageFiles.length === 0) {
            alert('PDFファイルと画像ファイルを選択してください。');
            return;
        }

        loadingOverlay.style.display = 'flex';

        try {
            const pdfBytes = await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            const pageNumber = parseInt(pageNumberNumber.value) || 1; // 数値入力フィールドから値を取得
            if (pageNumber < 1 || pageNumber > pages.length) {
                alert(`無効なページ番号です。1から${pages.length}の間で指定してください。`);
                loadingOverlay.style.display = 'none';
                return;
            }
            const targetPage = pages[pageNumber - 1]; // 指定されたページを取得

            const { width: pageWidth, height: pageHeight } = targetPage.getSize();

            // ユーザー設定オプションの取得
            const margin = parseInt(pageMarginNumber.value) || 0; // 数値入力フィールドから値を取得
            const imageSpacing = parseInt(imageSpacingNumber.value) || 0; // 数値入力フィールドから値を取得
            const userColumns = parseInt(columnsNumber.value) || 0; // 数値入力フィールドから値を取得

            // 画像を埋め込み、リサイズして配置
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
            const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 10); // 各画像のフォントサイズを取得、デフォルトは10
            const captionMarginTopBottom = 5; // キャプションの上下マージン

            const placements = calculateImagePlacements(
                numImages,
                pageWidth,
                pageHeight,
                margin,
                imageSpacing,
                userColumns,
                imageAspectRatios,
                captionFontSizes, // 配列を渡す
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

                // キャプションの描画
                if (selectedImageFiles[i].caption) {
                    const captionText = selectedImageFiles[i].caption;
                    const fontSize = selectedImageFiles[i].captionFontSize || 10;

                    // フォントファミリーに基づいてフォントを埋め込む
                    let font;
                    const fontFamily = selectedImageFiles[i].captionFontFamily;
                    
                    // フォントキャッシュを導入
                    if (!fontCache[fontFamily]) {
                        if (fontFamily === 'NotoSansJP') {
                            try {
                                // NotoSansJPフォントファイルを読み込む
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

                    // フォントカラーをRGBに変換
                    const hexColor = selectedImageFiles[i].captionFontColor || '#000000';
                    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
                    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
                    const b = parseInt(hexColor.slice(5, 7), 16) / 255;
                    const fontColor = PDFLib.rgb(r, g, b); // PDFLib.rgbではなくrgbを使用

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

            const pdfBytesModified = await pdfDoc.save();
            displayProcessedPdfPreview(pdfBytesModified);
        } catch (error) {
            console.error('Error during PDF processing:', error);
            alert('PDF処理中にエラーが発生しました。');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    });

    // 初期表示
    displayImagePreviews([]);
    updateRealtimePreview();

    // SortableJSの初期化
    new Sortable(imagePreviewContainer, {
        animation: 200,
        ghostClass: 'sortable-ghost', // ドラッグ中のアイテムのスタイル
        handle: '.drag-handle', // ドラッグハンドルを指定
        onEnd: function (evt) {
            const oldIndex = evt.oldIndex;
            const newIndex = evt.newIndex;

            // selectedImageFiles配列の順序を更新
            const [movedItem] = selectedImageFiles.splice(oldIndex, 1);
            selectedImageFiles.splice(newIndex, 0, movedItem);

            updateRealtimePreview(); // リアルタイムプレビューも更新
            console.log('画像の順序が更新されました:', selectedImageFiles.map(img => img.file.name));
        }
    });
});

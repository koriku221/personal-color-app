import * as PDFLib from 'pdf-lib';
import { getElement, loadingOverlay, selectedImageFiles, setSelectedImageFiles, heicConvert, Buffer, updateRealtimePreview, selectedPdfFile, pdfjsLib, setSelectedPdfPage, setProcessedPdfBytes, calculateImagePlacements, pdfPageSize } from './utils.js';
import Sortable from 'sortablejs'; // SortableJSをインポート

// Function to display image previews
export function displayImagePreviews(imageFileObjects) {
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

export function appendImageToPreview(src, fileName, id) { // indexではなくidを受け取る
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

export function removeImage(idToRemove) {
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

export function setupImageSelectListeners() {
    const imageFilesInput = getElement('imageFiles');
    const imageFileNamesSpan = getElement('imageFileNames');
    const prevButton = getElement('prevToPdfSelect');
    const clearButton = getElement('clearButton');
    const nextButton = getElement('nextToResult');
    const imagePreviewContainer = getElement('imagePreviewContainer');

    if (!imageFilesInput || !imageFileNamesSpan || !prevButton || !clearButton || !nextButton || !imagePreviewContainer) {
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

                tempSelectedImageFiles.push({ id: id, file: file, previewUrl: previewUrl, pdfEmbedBytes: pdfEmbedBytes, pdfEmbedType: pdfEmbedType, aspectRatio: aspectRatio, caption: file.name, captionFontSize: 10, captionFontColor: '#000000', captionFontFamily: 'NotoSansJP' });
            }
            setSelectedImageFiles([...selectedImageFiles, ...tempSelectedImageFiles]);
            displayImagePreviews(selectedImageFiles);
            updateRealtimePreview(); // リアルタイムプレビューを更新
            imageFileNamesSpan.textContent = `${selectedImageFiles.length} 個の画像が選択されました`;
            loadingOverlay.style.display = 'none';
        } else {
            setSelectedImageFiles([]);
            displayImagePreviews(selectedImageFiles);
            imageFileNamesSpan.textContent = '選択されていません';
            loadingOverlay.style.display = 'none';
        }
    };

    prevButton.onclick = () => {
        window.location.hash = '/pdf-select';
    };

    // Modified nextButton.onclick handler
    nextButton.onclick = async () => {
        if (!selectedPdfFile || selectedImageFiles.length === 0) {
            alert('PDFファイルと画像を少なくとも1つ選択してください。');
            return;
        }

        try {
            // 1. Load the original PDF
            const pdfBytes = await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            // Get placement data
            const numImages = selectedImageFiles.length;
            const imageAspectRatios = selectedImageFiles.map(img => img.aspectRatio);
            const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 10);
            const captionMarginTopBottom = 5; // Assuming this value

            // Get margin and spacing values from DOM elements
            const pageMarginTopNumber = getElement('pageMarginTopNumber');
            const pageMarginBottomNumber = getElement('pageMarginBottomNumber');
            const pageMarginLeftNumber = getElement('pageMarginLeftNumber');
            const pageMarginRightNumber = getElement('pageMarginRightNumber');
            const imageSpacingNumber = getElement('imageSpacingNumber');
            const columnsNumber = getElement('columnsNumber');

            if (!pageMarginTopNumber || !pageMarginBottomNumber || !pageMarginLeftNumber || !pageMarginRightNumber || !imageSpacingNumber || !columnsNumber) {
                throw new Error("Margin or spacing input elements not found.");
            }

            const marginTop = parseInt(pageMarginTopNumber.value) || 0;
            const marginBottom = parseInt(pageMarginBottomNumber.value) || 0;
            const marginLeft = parseInt(pageMarginLeftNumber.value) || 0;
            const marginRight = parseInt(pageMarginRightNumber.value) || 0;
            const imageSpacing = parseInt(imageSpacingNumber.value) || 0;
            const userColumns = parseInt(columnsNumber.value) || 0;

            // Calculate placements using the function from utils.js
            const placements = calculateImagePlacements(
                numImages,
                pdfPageSize.width, // Use the stored page size
                pdfPageSize.height,
                marginTop,
                marginBottom,
                marginLeft,
                marginRight,
                imageSpacing,
                userColumns,
                imageAspectRatios,
                captionFontSizes,
                captionMarginTopBottom
            );

            if (!placements) {
                throw new Error("Failed to calculate image placements.");
            }

            // Add images to PDF pages
            // For simplicity, assume all images are placed on the first page.
            // A more complex logic might distribute them or use a specific page.
            const targetPage = pages[0];

            for (let i = 0; i < numImages; i++) {
                const imageObj = selectedImageFiles[i];
                const placement = placements[i];

                // Get the image bytes
                const imageBytes = await fetch(imageObj.previewUrl).then(res => res.arrayBuffer());
                let embeddedImage;

                // Determine image type and embed
                if (imageObj.pdfEmbedType.startsWith('image/jpeg')) {
                    embeddedImage = await pdfDoc.embedJpg(imageBytes);
                } else if (imageObj.pdfEmbedType.startsWith('image/png')) {
                    embeddedImage = await pdfDoc.embedPng(imageBytes);
                } else {
                    console.warn(`Unsupported image type for embedding: ${imageObj.pdfEmbedType}. Skipping image ${imageObj.file.name}.`);
                    continue; // Skip unsupported types
                }

                // Draw the image
                targetPage.drawImage(embeddedImage, {
                    x: placement.image.x,
                    y: placement.image.y_pdf, // PDF coordinates are from bottom-left
                    width: placement.image.width,
                    height: placement.image.height,
                });

                // Add caption if it exists
                if (imageObj.caption) {
                    targetPage.drawText(imageObj.caption, {
                        x: placement.caption.x,
                        y: placement.caption.y_pdf, // PDF coordinates
                        size: placement.caption.height, // Use calculated height as font size
                        color: PDFLib.rgb(
                            parseInt(imageObj.captionFontColor.substring(1, 3), 16) / 255,
                            parseInt(imageObj.captionFontColor.substring(3, 5), 16) / 255,
                            parseInt(imageObj.captionFontColor.substring(5, 7), 16) / 255
                        ),
                        font: await getFont(pdfDoc, imageObj.captionFontFamily),
                    });
                }
            }

            // 3. Get the modified PDF bytes
            const modifiedPdfBytes = await pdfDoc.saveAsBytes();

            // 4. Store the bytes using the utility function
            setProcessedPdfBytes(modifiedPdfBytes);

            // 5. Navigate to the next screen
            window.location.hash = '/result';

        } catch (error) {
            console.error('PDF生成中にエラーが発生しました:', error);
            alert('PDFの生成に失敗しました。エラーメッセージを確認してください。');
        }
    };

    clearButton.onclick = () => {
        // プレビューURLを解放
        selectedImageFiles.forEach(imageObj => {
            if (imageObj.previewUrl) {
                URL.revokeObjectURL(imageObj.previewUrl);
            }
        });

        setSelectedImageFiles([]); // グローバルな画像ファイルリストをクリア
        displayImagePreviews(selectedImageFiles); // プレビュー表示をクリア
        updateRealtimePreview(); // リアルタイムプレビューもクリア
        if (imageFileNamesSpan) {
            imageFileNamesSpan.textContent = '選択されていません';
        }
        // ファイル選択インプットをリセット
        if (imageFilesInput) {
            imageFilesInput.value = '';
        }
        console.log('選択された画像がすべてクリアされました。');
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

    setupPdfPageCarousel();
}

async function setupPdfPageCarousel() {
    const carouselContainer = getElement('pdfPageCarousel');
    if (!carouselContainer || !selectedPdfFile) return;

    carouselContainer.innerHTML = ''; // Clear previous content

    try {
        const pdfBytes = await selectedPdfFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 0.5 }); // Use a smaller scale for thumbnails

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.dataset.pageNumber = i;
            canvas.classList.add('pdf-carousel-page');
            if (i === 1) {
                canvas.classList.add('selected');
            }

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
            };
            await page.render(renderContext).promise;

            canvas.onclick = async (event) => {
                const pageNum = parseInt(event.target.dataset.pageNumber);
                setSelectedPdfPage(pageNum);
                
                // Update selected state
                document.querySelectorAll('.pdf-carousel-page').forEach(p => p.classList.remove('selected'));
                event.target.classList.add('selected');

                // Update background preview
                const { renderPdfPageAsBackground } = await import('./options.js');
                renderPdfPageAsBackground();
            };

            carouselContainer.appendChild(canvas);
        }
    } catch (error) {
        console.error('PDF page carousel setup failed:', error);
    }
}

// Helper function to get PDFLib font
async function getFont(pdfDoc, fontFamily) {
    // This is a placeholder. Real implementation would involve loading font files.
    // For now, let's use standard PDF fonts or assume NotoSansJP is available if needed.
    // PDFLib supports standard fonts like 'Times-Roman', 'Helvetica', 'Courier'.
    // For custom fonts like NotoSansJP, they need to be loaded as bytes.
    switch (fontFamily) {
        case 'Helvetica':
            return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        case 'Times-Roman':
            return await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman);
        case 'Courier':
            return await pdfDoc.embedFont(PDFLib.StandardFonts.Courier);
        case 'NotoSansJP':
            // This requires loading the font file. For now, let's use Helvetica as a fallback.
            // If NotoSansJP is critical, we'd need to load it from public/fonts/NotoSansJP-Regular.ttf
            // Example: const fontBytes = await fetch('/public/fonts/NotoSansJP-Regular.ttf').then(res => res.arrayBuffer());
            // return await pdfDoc.embedFont(fontBytes);
            console.warn("NotoSansJP font not loaded, using Helvetica as fallback.");
            return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        default:
            return await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
    }
}

import { getElement, loadingOverlay, selectedImageFiles, setSelectedImageFiles, heicConvert, Buffer, updateRealtimePreview } from './utils.js';
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
            setSelectedImageFiles(tempSelectedImageFiles);
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

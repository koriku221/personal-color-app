import heicConvert from 'heic-convert';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'url:pdfjs-dist/build/pdf.worker.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

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
const pageMarginInput = document.getElementById('pageMargin');
const imageSpacingInput = document.getElementById('imageSpacing');
const columnsInput = document.getElementById('columns');
const pageNumberInput = document.getElementById('pageNumber');
const realtimePreviewContainer = document.getElementById('realtimePreviewContainer'); // リアルタイムプレビューコンテナ

let selectedPdfFile = null;
let pdfPageSize = { width: 595.28, height: 841.89 }; // A4のデフォルト値(pt)
// selectedImageFilesをファイルオブジェクト、プレビュー用データURL、PDF埋め込み用データとタイプ、アスペクト比のペアの配列に変更
let selectedImageFiles = []; // [{ file: File, previewUrl: string, pdfEmbedBytes: ArrayBuffer, pdfEmbedType: string, aspectRatio: number }]
let draggedItem = null; // ドラッグ中のアイテムを保持

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
        appendImageToPreview(imageObj.previewUrl, imageObj.file.name, index); // previewUrlを使用
    });

    // ドラッグアンドドロップイベントリスナーを再設定
    addDragAndDropListeners();
}

function appendImageToPreview(src, fileName, index) {
    const previewItem = document.createElement('div');
    previewItem.classList.add('image-preview-item');
    previewItem.dataset.index = index; // 削除時に使用するインデックス
    previewItem.draggable = true; // ドラッグ可能にする

    const img = document.createElement('img');
    img.src = src;
    img.classList.add('image-preview');
    img.alt = fileName;

    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-image-btn');
    removeButton.textContent = 'X';
    removeButton.addEventListener('click', (event) => {
        event.stopPropagation(); // ドラッグイベントと競合しないように
        removeImage(index);
    });

    previewItem.appendChild(img);
    previewItem.appendChild(removeButton);
    imagePreviewContainer.appendChild(previewItem);
    console.log(`displayImagePreviews: ファイル ${index} (${fileName}) の画像プレビューアイテムがコンテナに追加されました。`);
}

function addDragAndDropListeners() {
    const items = imagePreviewContainer.querySelectorAll('.image-preview-item');
    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            setTimeout(() => item.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', item.innerHTML); // Firefox対策
        });

        item.addEventListener('dragend', () => {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault(); // ドロップを許可
            if (e.target.closest('.image-preview-item') && e.target.closest('.image-preview-item') !== draggedItem) {
                const targetItem = e.target.closest('.image-preview-item');
                const bounding = targetItem.getBoundingClientRect();
                const offset = bounding.x + (bounding.width / 2);
                if (e.clientX < offset) {
                    imagePreviewContainer.insertBefore(draggedItem, targetItem);
                } else {
                    imagePreviewContainer.insertBefore(draggedItem, targetItem.nextSibling);
                }
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            // ドロップ処理はdragoverでDOMを操作しているので、ここでは何もしない
        });
    });

    // コンテナ全体へのドロップイベント（アイテムがない場合など）
    imagePreviewContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    imagePreviewContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem && !e.target.closest('.image-preview-item')) {
            // アイテムがない場所にドロップされた場合、最後に追加
            imagePreviewContainer.appendChild(draggedItem);
        }
        updateImageOrder();
    });
}

function updateImageOrder() {
    const newOrderItems = Array.from(imagePreviewContainer.querySelectorAll('.image-preview-item'));
    const reorderedSelectedImageFiles = [];
    newOrderItems.forEach(item => {
        const originalIndex = parseInt(item.dataset.index);
        // originalIndexがselectedImageFilesの範囲内にあることを確認
        if (originalIndex >= 0 && originalIndex < selectedImageFiles.length) {
            reorderedSelectedImageFiles.push(selectedImageFiles[originalIndex]);
        } else {
            console.warn(`updateImageOrder: 無効なoriginalIndex ${originalIndex} が検出されました。`);
        }
    });
    selectedImageFiles = reorderedSelectedImageFiles;
    // 新しい順序でプレビューを再描画し、dataset.indexを更新
    displayImagePreviews(selectedImageFiles);
    updateRealtimePreview(); // リアルタイムプレビューも更新
    console.log('画像の順序が更新されました:', selectedImageFiles.map(img => img.file.name));
}

function removeImage(indexToRemove) {
    console.log(`removeImage: インデックス ${indexToRemove} の画像を削除します。`);
    // URL.revokeObjectURLで以前作成したプレビュー用URLを解放
    if (selectedImageFiles[indexToRemove] && selectedImageFiles[indexToRemove].previewUrl) {
        URL.revokeObjectURL(selectedImageFiles[indexToRemove].previewUrl);
    }
    selectedImageFiles = selectedImageFiles.filter((_, index) => index !== indexToRemove);
    displayImagePreviews(selectedImageFiles); // プレビューを再描画
    updateRealtimePreview(); // リアルタイムプレビューも更新
    if (imageFileNamesSpan) {
        imageFileNamesSpan.textContent = selectedImageFiles.length > 0 ? `${selectedImageFiles.length} 個の画像が選択されました` : '選択されていません';
    }
}

// リアルタイムプレビューを更新する関数
function updateRealtimePreview() {
    console.log('updateRealtimePreview: リアルタイムプレビュー更新関数が呼び出されました。');
    // 画像要素のみをクリア
    const images = realtimePreviewContainer.querySelectorAll('.realtime-preview-image');
    images.forEach(img => img.remove());

    // テキストメッセージをクリア
    const message = realtimePreviewContainer.querySelector('p');
    if (message) message.remove();

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
    const margin = parseInt(pageMarginInput.value) || 0;
    const imageSpacing = parseInt(imageSpacingInput.value) || 0;
    const userColumns = parseInt(columnsInput.value) || 0;

    const numImages = selectedImageFiles.length;
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

            const imageUsableWidth = gridCellWidth - imageSpacing;
            const imageUsableHeight = gridCellHeight - imageSpacing;

            if (imageUsableWidth <= 0 || imageUsableHeight <= 0) continue;

            let allImagesFit = true;
            for (const imageObj of selectedImageFiles) {
                const aspectRatio = imageObj.aspectRatio;
                let currentImgWidth = imageUsableWidth;
                let currentImgHeight = imageUsableWidth / aspectRatio;

                if (currentImgHeight > imageUsableHeight) {
                    currentImgHeight = imageUsableHeight;
                    currentImgWidth = imageUsableHeight * aspectRatio;
                }

                if (currentImgWidth > imageUsableWidth || currentImgHeight > imageUsableHeight) {
                    allImagesFit = false;
                    break;
                }
            }

            if (allImagesFit) {
                if (imageUsableWidth * imageUsableHeight > currentBestArea) {
                    currentBestArea = imageUsableWidth * imageUsableHeight;
                    bestCols = cols;
                    bestRows = rows;
                }
            }
        }
    }

    if (bestCols === 0 || bestRows === 0) {
        realtimePreviewContainer.innerHTML = '<p>画像を配置できませんでした。オプションを調整してください。</p>';
        console.log('updateRealtimePreview: 画像配置計算失敗。');
        return;
    }

    const gridCellWidth = usableWidth / bestCols;
    const gridCellHeight = usableHeight / bestRows;

    const imageUsableWidth = gridCellWidth - imageSpacing;
    const imageUsableHeight = gridCellHeight - imageSpacing;

    if (imageUsableWidth <= 0 || imageUsableHeight <= 0) {
        realtimePreviewContainer.innerHTML = '<p>画像を配置できませんでした。オプションを調整してください。</p>';
        console.log('updateRealtimePreview: 画像が利用可能なスペースに収まりません。');
        return;
    }

    selectedImageFiles.forEach((imageObj, i) => {
        const col = i % bestCols;
        const row = Math.floor(i / bestCols);

        const aspectRatio = imageObj.aspectRatio;
        let imgWidth = imageUsableWidth;
        let imgHeight = imageUsableWidth / aspectRatio;

        if (imgHeight > imageUsableHeight) {
            imgHeight = imageUsableHeight;
            imgWidth = imageUsableHeight * aspectRatio;
        }

        const xOffset = (imageUsableWidth - imgWidth) / 2;
        const yOffset = (imageUsableHeight - imgHeight) / 2;

        const x = margin + col * gridCellWidth + xOffset;
        const y = margin + row * gridCellHeight + yOffset;

        const imgElement = document.createElement('img');
        imgElement.src = imageObj.previewUrl;
        imgElement.classList.add('realtime-preview-image');
        // スケーリング係数を適用して表示
        imgElement.style.left = `${x * scale}px`;
        imgElement.style.top = `${y * scale}px`;
        imgElement.style.width = `${imgWidth * scale}px`;
        imgElement.style.height = `${imgHeight * scale}px`;
        realtimePreviewContainer.appendChild(imgElement);
        console.log(`updateRealtimePreview: 画像 ${i} (${imageObj.file.name}) を位置 (x:${x * scale}, y:${y * scale})、サイズ (w:${imgWidth * scale}, h:${imgHeight * scale}) で描画しました。`);
    });
}

// PDFの指定ページをレンダリングしてプレビューの背景に設定する関数
async function renderPdfPageAsBackground() {
    if (!selectedPdfFile) {
        realtimePreviewContainer.style.backgroundImage = 'none';
        return;
    }

    try {
        const pageNumber = parseInt(pageNumberInput.value) || 1;
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
                pageNumberInput.max = pages.length; // 最大ページ数を設定
                pageNumberInput.value = 1; // PDFを変更したら1ページ目に戻す

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

                tempSelectedImageFiles.push({ file: file, previewUrl: previewUrl, pdfEmbedBytes: pdfEmbedBytes, pdfEmbedType: pdfEmbedType, aspectRatio: aspectRatio });
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

            const pageNumber = parseInt(pageNumberInput.value) || 1;
            if (pageNumber < 1 || pageNumber > pages.length) {
                alert(`無効なページ番号です。1から${pages.length}の間で指定してください。`);
                loadingOverlay.style.display = 'none';
                return;
            }
            const targetPage = pages[pageNumber - 1]; // 指定されたページを取得

            const { width: pageWidth, height: pageHeight } = targetPage.getSize();

            // ユーザー設定オプションの取得
            const margin = parseInt(pageMarginInput.value) || 0;
            const imageSpacing = parseInt(imageSpacingInput.value) || 0;
            const userColumns = parseInt(columnsInput.value) || 0;

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

            // 画像の配置計算
            const numImages = embeddedImages.length;
            const usableWidth = pageWidth - 2 * margin;
            const usableHeight = pageHeight - 2 * margin;

            let bestCols = userColumns > 0 ? userColumns : 1;
            let bestRows = Math.ceil(numImages / bestCols);

            // ユーザーが列数を指定しない場合、最適なグリッドレイアウトを計算
            if (userColumns === 0) {
                let currentBestArea = 0;
                for (let cols = 1; cols <= numImages; cols++) {
                    const rows = Math.ceil(numImages / cols);

                    // 各グリッドセルが利用できる総幅と高さ (画像と画像間のスペースを含む)
                    const gridCellWidth = usableWidth / cols;
                    const gridCellHeight = usableHeight / rows;

                    // 各画像が利用できる幅と高さ (画像間のスペースを引いたもの)
                    const imageUsableWidth = gridCellWidth - imageSpacing;
                    const imageUsableHeight = gridCellHeight - imageSpacing;

                    if (imageUsableWidth <= 0 || imageUsableHeight <= 0) continue; // 無効な画像サイズ

                    let allImagesFit = true;
                    for (const img of embeddedImages) {
                        const aspectRatio = img.width / img.height;
                        let currentImgWidth = imageUsableWidth;
                        let currentImgHeight = imageUsableWidth / aspectRatio;

                        if (currentImgHeight > imageUsableHeight) {
                            currentImgHeight = imageUsableHeight;
                            currentImgWidth = imageUsableHeight * aspectRatio;
                        }

                        if (currentImgWidth > imageUsableWidth || currentImgHeight > imageUsableHeight) {
                            allImagesFit = false;
                            break;
                        }
                    }

                    if (allImagesFit) {
                        if (imageUsableWidth * imageUsableHeight > currentBestArea) {
                            currentBestArea = imageUsableWidth * imageUsableHeight;
                            bestCols = cols;
                            bestRows = rows;
                        }
                    }
                }
            }

            if (bestCols === 0 || bestRows === 0) {
                alert('画像をページに配置できませんでした。画像が大きすぎるか、ページが小さすぎます。');
                loadingOverlay.style.display = 'none';
                return;
            }

            // 各グリッドセルが占める総幅と高さ
            const gridCellWidth = usableWidth / bestCols;
            const gridCellHeight = usableHeight / bestRows;

            // 各画像が利用できる幅と高さ (画像間のスペースを引いたもの)
            const imageUsableWidth = gridCellWidth - imageSpacing;
            const imageUsableHeight = gridCellHeight - imageSpacing;

            if (imageUsableWidth <= 0 || imageUsableHeight <= 0) {
                alert('画像をページに配置できませんでした。指定されたマージン、スペース、列数では画像が収まりません。');
                loadingOverlay.style.display = 'none';
                return;
            }

            for (let i = 0; i < numImages; i++) {
                const image = embeddedImages[i];
                const col = i % bestCols;
                const row = Math.floor(i / bestCols);

                const aspectRatio = image.width / image.height;

                let imgWidth = imageUsableWidth;
                let imgHeight = imageUsableWidth / aspectRatio;

                if (imgHeight > imageUsableHeight) {
                    imgHeight = imageUsableHeight;
                    imgWidth = imageUsableHeight * aspectRatio;
                }

                // 画像をセル内で中央揃え
                const xOffset = (imageUsableWidth - imgWidth) / 2;
                const yOffset = (imageUsableHeight - imgHeight) / 2;

                // 画像の描画位置
                const x = margin + col * gridCellWidth + xOffset;
                // y座標はページの下から計算されるため、ページの上端からマージンを引いた位置を基準に、
                // 各グリッドセルの上端から画像が中央に配置されるように調整
                const y = pageHeight - margin - (row + 1) * gridCellHeight + (gridCellHeight - imgHeight) / 2;

                targetPage.drawImage(image, {
                    x,
                    y,
                    width: imgWidth,
                    height: imgHeight,
                });
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

    // オプション変更時にリアルタイムプレビューを更新するイベントリスナー
    pageMarginInput.addEventListener('input', updateRealtimePreview);
    imageSpacingInput.addEventListener('input', updateRealtimePreview);
    columnsInput.addEventListener('input', updateRealtimePreview);

    // ページ番号変更時にプレビューの縦横比と背景を更新するイベントリスナー
    pageNumberInput.addEventListener('input', async () => {
        if (!selectedPdfFile) return;

        const pageNumber = parseInt(pageNumberInput.value) || 1;

        try {
            const pdfBytes = await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes);
            const pages = pdfDoc.getPages();

            if (pageNumber < 1 || pageNumber > pages.length) {
                return; // 無効なページ番号の場合は更新しない
            }

            const targetPage = pages[pageNumber - 1];
            const { width, height } = targetPage.getSize();
            pdfPageSize = { width, height }; // グローバル変数を更新
            realtimePreviewContainer.style.aspectRatio = `${width} / ${height}`;
            await renderPdfPageAsBackground(); // 背景を更新
            updateRealtimePreview(); // プレビューを再描画
        } catch (error) {
            console.error('PDFのページサイズの取得に失敗しました:', error);
        }
    });

    // 初期表示
    displayImagePreviews([]);
    updateRealtimePreview();
});

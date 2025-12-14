import * as PDFLib from 'pdf-lib';
import fontkit from "@pdf-lib/fontkit";
import { getElement, loadingOverlay, selectedPdfFile, selectedImageFiles, pdfPageSize, fontCache, setProcessedPdfBytes, pdfjsLib, calculateImagePlacements, updateRealtimePreview, setPdfPageSize, selectedPdfPage, processedPdfBytes } from './utils.js';
import { renderPdfPageAsBackground, setupPdfPageCarousel, resetImageSelection } from './image-select.js';

export async function setupOptionsListeners() {
    const embedButton = getElement('embedButton');
    const imageSpacingSlider = getElement('imageSpacingSlider');
    const imageSpacingNumber = getElement('imageSpacingNumber');
    const columnsSlider = getElement('columnsSlider');
    const columnsNumber = getElement('columnsNumber');
    const realtimePreviewContainer = getElement('realtimePreviewContainer');

    // New inputs for individual margins
    const pageMarginTopSlider = getElement('pageMarginTopSlider');
    const pageMarginTopNumber = getElement('pageMarginTopNumber');
    const pageMarginBottomSlider = getElement('pageMarginBottomSlider');
    const pageMarginBottomNumber = getElement('pageMarginBottomNumber');
    const pageMarginLeftSlider = getElement('pageMarginLeftSlider');
    const pageMarginLeftNumber = getElement('pageMarginLeftNumber');
    const pageMarginRightSlider = getElement('pageMarginRightSlider');
    const pageMarginRightNumber = getElement('pageMarginRightNumber');

    if (!embedButton || 
		!pageMarginTopSlider || !pageMarginTopNumber ||
		!pageMarginBottomSlider || !pageMarginBottomNumber ||
		!pageMarginLeftSlider || !pageMarginLeftNumber ||
		!pageMarginRightSlider || !pageMarginRightNumber ||
        !imageSpacingSlider || !imageSpacingNumber || !columnsSlider || !columnsNumber || !realtimePreviewContainer) {
        console.warn('オプション設定画面のDOM要素が見つかりませんでした。');
        return;
    }

    function syncInputs(slider, numberInput) {
        slider.value = numberInput.value;
    }

    pageMarginTopSlider.oninput = () => {
        pageMarginTopNumber.value = pageMarginTopSlider.value;
        updateRealtimePreview();
    };
    pageMarginBottomSlider.oninput = () => {
        pageMarginBottomNumber.value = pageMarginBottomSlider.value;
        updateRealtimePreview();
    };
    pageMarginLeftSlider.oninput = () => {
        pageMarginLeftNumber.value = pageMarginLeftSlider.value;
        updateRealtimePreview();
    };
    pageMarginRightSlider.oninput = () => {
        pageMarginRightNumber.value = pageMarginRightSlider.value;
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

    pageMarginTopNumber.oninput = () => {
        syncInputs(pageMarginTopSlider, pageMarginTopNumber);
        updateRealtimePreview();
    };
    pageMarginBottomNumber.oninput = () => {
        syncInputs(pageMarginBottomSlider, pageMarginBottomNumber);
        updateRealtimePreview();
    };
    pageMarginLeftNumber.oninput = () => {
        syncInputs(pageMarginLeftSlider, pageMarginLeftNumber);
        updateRealtimePreview();
    };
    pageMarginRightNumber.oninput = () => {
        syncInputs(pageMarginRightSlider, pageMarginRightNumber);
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

    embedButton.onclick = async () => {
        if (!selectedPdfFile || selectedImageFiles.length === 0) {
            alert('PDFファイルと画像ファイルを選択してください。');
            return;
        }

        loadingOverlay.style.display = 'flex';

        try {
            const pdfBytes = processedPdfBytes || await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes); // グローバルなPDFLibを使用
            const pages = pdfDoc.getPages();

			// 🔹 日本語フォントなどのカスタムフォントを使う前に登録
+       	pdfDoc.registerFontkit(fontkit);

            const pageNumber = selectedPdfPage;
            if (pageNumber < 1 || pageNumber > pages.length) {
                alert(`無効なページ番号です。1から${pages.length}の間で指定してください。`);
                loadingOverlay.style.display = 'none';
                return;
            }
            const targetPage = pages[pageNumber - 1];

            const { width: pageWidth, height: pageHeight } = targetPage.getSize();

            const marginTop = parseInt(pageMarginTopNumber.value) || 0;
            const marginBottom = parseInt(pageMarginBottomNumber.value) || 0;
            const marginLeft = parseInt(pageMarginLeftNumber.value) || 0;
            const marginRightTop = parseInt(pageMarginRightNumber.value) || 0;
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
            const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 20);
            const captionMarginTopBottom = 5;

            const placements = calculateImagePlacements(
                numImages,
                pageWidth,
                pageHeight,
                marginTop,
                marginBottom,
                marginLeft,
                marginRightTop,
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
                    const fontSize = selectedImageFiles[i].captionFontSize || 20;

                    let font;
                    const fontFamily = selectedImageFiles[i].captionFontFamily;
                    
                    if (!fontCache[fontFamily]) {
                        if (fontFamily === 'NotoSansJP') {
                            try {
								const fontUrl = new URL('./public/fonts/NotoSansJP-Regular.ttf', import.meta.url);
								const fontBytes = await fetch(fontUrl).then(res => res.arrayBuffer());
								console.log('Font bytes length:', fontBytes.byteLength);
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

            await setProcessedPdfBytes(await pdfDoc.save()); // 処理済みPDFを保存
			
            alert('画像をPDFに貼り付けました。');
            setupPdfPageCarousel(); // プレビューを更新
            resetImageSelection(); // 画像をクリア
			renderPdfPageAsBackground(); // プレビューを更新
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
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes); // グローバルなPDFLibを使用
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { width, height } = firstPage.getSize();
            setPdfPageSize({ width, height }); // utils.jsのsetterを使用
            realtimePreviewContainer.style.aspectRatio = `${width} / ${height}`;
            renderPdfPageAsBackground();
            updateRealtimePreview();
        } catch (error) {
            console.error('PDFのページサイズの取得に失敗しました:', error);
            // pdfPageSize = { width: 595.28, height: 841.89 }; // utils.jsのsetterを使用
            realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
            updateRealtimePreview();
        }
    } else {
        realtimePreviewContainer.style.backgroundImage = 'none';
        realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
    }
}

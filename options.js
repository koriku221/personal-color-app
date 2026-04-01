import * as PDFLib from 'pdf-lib';
import fontkit from "@pdf-lib/fontkit";
import { getElement, loadingOverlay, selectedPdfFile, selectedImageFiles, pdfPageSize, fontCache, setProcessedPdfBytes, calculateImagePlacements, updateRealtimePreview, selectedPdfPage, processedPdfBytes, layoutOptions, setLayoutOptions, showToast } from './utils.js';
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
        setLayoutOptions({ marginTop: parseInt(pageMarginTopSlider.value) });
        updateRealtimePreview();
    };
    pageMarginBottomSlider.oninput = () => {
        pageMarginBottomNumber.value = pageMarginBottomSlider.value;
        setLayoutOptions({ marginBottom: parseInt(pageMarginBottomSlider.value) });
        updateRealtimePreview();
    };
    pageMarginLeftSlider.oninput = () => {
        pageMarginLeftNumber.value = pageMarginLeftSlider.value;
        setLayoutOptions({ marginLeft: parseInt(pageMarginLeftSlider.value) });
        updateRealtimePreview();
    };
    pageMarginRightSlider.oninput = () => {
        pageMarginRightNumber.value = pageMarginRightSlider.value;
        setLayoutOptions({ marginRight: parseInt(pageMarginRightSlider.value) });
        updateRealtimePreview();
    };
    imageSpacingSlider.oninput = () => {
        imageSpacingNumber.value = imageSpacingSlider.value;
        setLayoutOptions({ imageSpacing: parseInt(imageSpacingSlider.value) });
        updateRealtimePreview();
    };
    columnsSlider.oninput = () => {
        columnsNumber.value = columnsSlider.value;
        setLayoutOptions({ columns: parseInt(columnsSlider.value) });
        updateRealtimePreview();
    };

    pageMarginTopNumber.oninput = () => {
        syncInputs(pageMarginTopSlider, pageMarginTopNumber);
        setLayoutOptions({ marginTop: parseInt(pageMarginTopNumber.value) });
        updateRealtimePreview();
    };
    pageMarginBottomNumber.oninput = () => {
        syncInputs(pageMarginBottomSlider, pageMarginBottomNumber);
        setLayoutOptions({ marginBottom: parseInt(pageMarginBottomNumber.value) });
        updateRealtimePreview();
    };
    pageMarginLeftNumber.oninput = () => {
        syncInputs(pageMarginLeftSlider, pageMarginLeftNumber);
        setLayoutOptions({ marginLeft: parseInt(pageMarginLeftNumber.value) });
        updateRealtimePreview();
    };
    pageMarginRightNumber.oninput = () => {
        syncInputs(pageMarginRightSlider, pageMarginRightNumber);
        setLayoutOptions({ marginRight: parseInt(pageMarginRightNumber.value) });
        updateRealtimePreview();
    };
    imageSpacingNumber.oninput = () => {
        syncInputs(imageSpacingSlider, imageSpacingNumber);
        setLayoutOptions({ imageSpacing: parseInt(imageSpacingNumber.value) });
        updateRealtimePreview();
    };
    columnsNumber.oninput = () => {
        syncInputs(columnsSlider, columnsNumber);
        setLayoutOptions({ columns: parseInt(columnsNumber.value) });
        updateRealtimePreview();
    };

    embedButton.onclick = async () => {
        if (!selectedPdfFile || selectedImageFiles.length === 0) {
            showToast('PDFファイルと画像ファイルを選択してください。', 'error');
            return;
        }

        // フォントはPDFDocumentインスタンスに紐付いているため、毎回クリアする
        Object.keys(fontCache).forEach(k => delete fontCache[k]);

        loadingOverlay.style.display = 'flex';

        try {
            const pdfBytes = processedPdfBytes || await selectedPdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes); // グローバルなPDFLibを使用
            const pages = pdfDoc.getPages();

			// 🔹 日本語フォントなどのカスタムフォントを使う前に登録
+       	pdfDoc.registerFontkit(fontkit);

            const pageNumber = selectedPdfPage;
            if (pageNumber < 1 || pageNumber > pages.length) {
                showToast(`無効なページ番号です。1から${pages.length}の間で指定してください。`, 'error');
                loadingOverlay.style.display = 'none';
                return;
            }
            const targetPage = pages[pageNumber - 1];

            const { width: pageWidth, height: pageHeight } = targetPage.getSize();

            const { marginTop, marginBottom, marginLeft, marginRight, imageSpacing, columns: userColumns } = layoutOptions;

            const embeddedImages = [];
            for (const imageObj of selectedImageFiles) {
                let image;
                if (imageObj.pdfEmbedType === 'image/jpeg') {
                    image = await pdfDoc.embedJpg(imageObj.pdfEmbedBytes);
                } else if (imageObj.pdfEmbedType === 'image/png') {
                    image = await pdfDoc.embedPng(imageObj.pdfEmbedBytes);
                } else {
                    showToast(`サポートされていない画像形式です: ${imageObj.file.name} (JPEG, PNG, HEICのみ)`, 'error');
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
                marginRight,
                imageSpacing,
                userColumns,
                imageAspectRatios,
                captionFontSizes,
                captionMarginTopBottom
            );

            if (!placements) {
                showToast('画像をページに配置できませんでした。オプションを調整してください。', 'error');
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
			
            showToast('画像をPDFに貼り付けました。', 'success');
            setupPdfPageCarousel(); // プレビューを更新
            resetImageSelection(); // 画像をクリア
			renderPdfPageAsBackground(); // プレビューを更新
        } catch (error) {
            console.error('Error during PDF processing:', error);
            showToast('PDF処理中にエラーが発生しました。', 'error');
        } finally {
            loadingOverlay.style.display = 'none';
        }
    };

    // 初期表示
    realtimePreviewContainer.style.aspectRatio = `${pdfPageSize.width} / ${pdfPageSize.height}`;
    if (selectedPdfFile) {
        renderPdfPageAsBackground();
    } else {
        realtimePreviewContainer.style.backgroundImage = 'none';
    }
    updateRealtimePreview();
}

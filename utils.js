if (!Promise.withResolvers) {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'url:pdfjs-dist/build/pdf.worker.min.js';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
import { Buffer } from 'buffer'; // Bufferポリフィルをインポート
import heicConvert from 'heic-convert';

export { pdfjsLib, workerSrc, Buffer, heicConvert };

window.fontCache = window.fontCache || {}; // フォントキャッシュをグローバルスコープに定義
export const fontCache = window.fontCache; // 既存のコードとの互換性のために参照を保持

// SPAのルート要素
export const app = document.getElementById('app');
export const loadingOverlay = document.getElementById('loadingOverlay');

export let selectedPdfFile = null;
export let pdfPageSize = { width: 595.28, height: 841.89 }; // A4のデフォルト値(pt)
export let selectedImageFiles = []; // [{ file: File, previewUrl: string, pdfEmbedBytes: ArrayBuffer, pdfEmbedType: string, aspectRatio: number }]
export let processedPdfBytes = null; // 処理済みPDFのバイトデータを保持

// DOM要素を動的に取得するためのヘルパー関数
export const getElement = (id) => document.getElementById(id);

// Setter関数
export const setSelectedPdfFile = (file) => { selectedPdfFile = file; };
export const setPdfPageSize = (size) => { pdfPageSize = size; };
export const setSelectedImageFiles = (files) => { selectedImageFiles = files; };
export const setProcessedPdfBytes = (bytes) => { processedPdfBytes = bytes; };

// Function to display PDF preview
export function displayPdfPreview(file) {
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
export function displayProcessedPdfPreview(pdfBytes) {
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

export function calculateImagePlacements(
    numImages,
    pageWidth,
    pageHeight,
    marginTop, // Changed from margin
    marginBottom, // New parameter
    marginLeft, // New parameter
    marginRight, // New parameter
    imageSpacing,
    userColumns,
    imageAspectRatios,
    captionFontSizes,
    captionMarginTopBottom
) {
    const placements = [];
    // Updated to use individual margins
    const usableWidth = pageWidth - marginLeft - marginRight;
    const usableHeight = pageHeight - marginTop - marginBottom;

    let bestCols = userColumns > 0 ? userColumns : 1;
    let bestRows = Math.ceil(numImages / bestCols);

    if (userColumns === 0) {
        let currentBestArea = 0;
        for (let cols = 1; cols <= numImages; cols++) {
            const rows = Math.ceil(numImages / cols);

            // Use usableWidth and usableHeight for grid cell calculation
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

    // Use usableWidth and usableHeight for grid cell calculation
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

        // Updated to use individual margins for positioning
        const imageX = marginLeft + col * gridCellWidth + blockXOffset;
        const imageY_realtime = marginTop + row * gridCellHeight + blockYOffset;
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

export function updateRealtimePreview() { // Reverted to no arguments
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

    // Get individual margin values from DOM elements
    const pageMarginTopNumber = getElement('pageMarginTopNumber');
    const pageMarginBottomNumber = getElement('pageMarginBottomNumber');
    const pageMarginLeftNumber = getElement('pageMarginLeftNumber');
    const pageMarginRightNumber = getElement('pageMarginRightNumber');

    const marginTop = parseInt(pageMarginTopNumber.value) || 0;
    const marginBottom = parseInt(pageMarginBottomNumber.value) || 0;
    const marginLeft = parseInt(pageMarginLeftNumber.value) || 0;
    const marginRight = parseInt(pageMarginRightNumber.value) || 0;

    const imageSpacingNumber = getElement('imageSpacingNumber');
    const columnsNumber = getElement('columnsNumber');
    if (!imageSpacingNumber || !columnsNumber) return;

    const imageSpacing = parseInt(imageSpacingNumber.value) || 0;
    const userColumns = parseInt(columnsNumber.value) || 0;

    const pageMarginGuide = document.createElement('div');
    pageMarginGuide.classList.add('page-margin-guide');
    pageMarginGuide.style.left = `${marginLeft * scale}px`; // Use marginLeft
    pageMarginGuide.style.top = `${marginTop * scale}px`;   // Use marginTop
    pageMarginGuide.style.width = `${(pageWidth - marginLeft - marginRight) * scale}px`; // Use marginLeft and marginRight
    pageMarginGuide.style.height = `${(pageHeight - marginTop - marginBottom) * scale}px`; // Use marginTop and marginBottom
    realtimePreviewContainer.appendChild(pageMarginGuide);

    const numImages = selectedImageFiles.length;
    const imageAspectRatios = selectedImageFiles.map(img => img.aspectRatio);
    const captionFontSizes = selectedImageFiles.map(img => img.captionFontSize || 10);
    const captionMarginTopBottom = 5;

    // Pass individual margins to calculateImagePlacements
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

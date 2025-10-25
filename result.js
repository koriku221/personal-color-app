import { getElement, processedPdfBytes, setProcessedPdfBytes, setSelectedPdfFile, setSelectedImageFiles, displayProcessedPdfPreview } from './utils.js';

export function setupResultListeners() {
    const restartButton = getElement('restartApp');
    if (!restartButton) {
        console.warn('結果画面のDOM要素が見つかりませんでした。');
        return;
    }

    restartButton.onclick = () => {
        // 状態をリセットして最初の画面に戻る
        setSelectedPdfFile(null);
        setSelectedImageFiles([]);
        setProcessedPdfBytes(null);
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

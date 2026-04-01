import { getElement, selectedPdfFile, setSelectedPdfFile, setPdfPageSize, displayPdfPreview, showToast } from './utils.js';

export function setupPdfSelectListeners() {
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
            setSelectedPdfFile(target.files[0]);
            pdfFileNameSpan.textContent = selectedPdfFile.name;
            await displayPdfPreview(selectedPdfFile);
        } else {
            setSelectedPdfFile(null);
            pdfFileNameSpan.textContent = '選択されていません';
            setPdfPageSize({ width: 595.28, height: 841.89 });
        }
    };

    nextButton.onclick = () => {
        if (selectedPdfFile) {
            window.location.hash = '/image-select';
        } else {
            showToast('PDFファイルを選択してください。', 'error');
        }
    };

    // 既存のPDFファイルがあればプレビューを表示
    if (selectedPdfFile) {
        displayPdfPreview(selectedPdfFile);
        pdfFileNameSpan.textContent = selectedPdfFile.name;
    }
}

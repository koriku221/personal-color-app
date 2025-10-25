import { getElement, selectedPdfFile, setSelectedPdfFile, setPdfPageSize, displayPdfPreview } from './utils.js';

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
            displayPdfPreview(selectedPdfFile);
            pdfFileNameSpan.textContent = selectedPdfFile.name;
            try {
                const pdfBytes = await selectedPdfFile.arrayBuffer();
                const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes); // グローバルなPDFLibを使用
                const pages = pdfDoc.getPages();
                setPdfPageSize(pages[0].getSize()); // 最初のページのサイズを取得
            } catch (error) {
                console.error('PDFのページサイズの取得に失敗しました:', error);
                setPdfPageSize({ width: 595.28, height: 841.89 }); // エラー時はデフォルト(A4)に戻す
            }
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
            alert('PDFファイルを選択してください。');
        }
    };

    // 既存のPDFファイルがあればプレビューを表示
    if (selectedPdfFile) {
        displayPdfPreview(selectedPdfFile);
        pdfFileNameSpan.textContent = selectedPdfFile.name;
    }
}

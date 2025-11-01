import { app, getElement } from './utils.js';
import { setupPdfSelectListeners } from './pdf-select.js';
import { setupImageSelectListeners } from './image-select.js';
import { setupOptionsListeners } from './options.js';
import { setupResultListeners } from './result.js';
import { setupPanelResizer } from './panel-resizer.js'; // 新しいファイルからインポート

export const routes = {
    '/': {
        title: 'PCレポート作成 - PDF選択',
        className: 'page-pdf-select',
        render: () => `
            <h1>PDFファイルを選択</h1>
            <div class="input-group">
                <label for="pdfFile" class="btn btn-border"><span>PDFファイルを選択</span></label>
                <input type="file" id="pdfFile" accept="application/pdf" style="display: none;">
                <span id="pdfFileName" class="file-name">選択されていません</span>
            </div>
            <h2>PDFプレビュー</h2>
            <div id="pdfPreviewContainer">
                <p>PDFファイルを選択するとここにプレビューが表示されます。</p>
            </div>
            <div class="btn-wrap">
                <a id="nextToImageSelect" class="btn btn-stripe"><span>次へ</span></a>
            </div>
        `,
        onMount: setupPdfSelectListeners
    },
    '/pdf-select': { // '/' と同じ内容だが、明示的なパスとして定義
        title: 'PCレポート作成 - PDF選択',
        className: 'page-pdf-select',
        render: () => `
            <h1>PDFファイルを選択</h1>
            <div class="input-group">
                <label for="pdfFile" class="btn btn-border"><span>PDFファイルを選択</span></label>
                <input type="file" id="pdfFile" accept="application/pdf" style="display: none;">
                <span id="pdfFileName" class="file-name">選択されていません</span>
            </div>
            <h2>PDFプレビュー</h2>
            <div id="pdfPreviewContainer">
                <p>PDFファイルを選択するとここにプレビューが表示されます。</p>
            </div>
            <div class="btn-wrap">
                <a id="nextToImageSelect" class="btn btn-stripe"><span>次へ</span></a>
            </div>
        `,
        onMount: setupPdfSelectListeners
    },
    '/image-select': {
        title: 'PCレポート作成 - 画像配置',
        className: 'page-image-select',
        render: () => `
            <div class="image-select-layout">
                <div class="options-sidebar" id="options-sidebar-panel">
                    <div class="panel-resizer" id="panel-resizer"></div>
                    <h1>画像配置</h1>
                    <div class="input-group">
                        <label for="imageFiles" class="btn btn-border"><span>画像ファイルを選択</span></label>
                        <input type="file" id="imageFiles" accept="image/*" multiple style="display: none;">
                        <span id="imageFileNames" class="file-name">選択されていません</span>
                    </div>
                    <div class="input-group">
                        <a id="clearButton" class="btn btn-border"><span>オプションクリア</span></a>
                    </div>
					<details class="accordion">
    					<summary>画像一覧</summary>
						<div id="imagePreviewContainer" class="image-preview-container sortable-list">
							<p>画像ファイルを選択するとここにプレビューが表示されます。</p>
						</div>
					</details>
					<details class="accordion options-group">
    					<summary>配置オプション</summary>
						<div class="accordion-content">
							<div class="inputs-wrapper">
								<label for="pageMarginTop">上マージン (pt):</label>
								<div class="input-controls">
									<input type="range" id="pageMarginTopSlider" value="20" min="0" max="500" step="1">
									<input type="number" id="pageMarginTopNumber" value="20" min="0" max="500">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="pageMarginBottom">下マージン (pt):</label>
								<div class="input-controls">
									<input type="range" id="pageMarginBottomSlider" value="20" min="0" max="500" step="1">
									<input type="number" id="pageMarginBottomNumber" value="20" min="0" max="500">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="pageMarginLeft">左マージン (pt):</label>
								<div class="input-controls">
									<input type="range" id="pageMarginLeftSlider" value="20" min="0" max="500" step="1">
									<input type="number" id="pageMarginLeftNumber" value="20" min="0" max="500">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="pageMarginRight">右マージン (pt):</label>
								<div class="input-controls">
									<input type="range" id="pageMarginRightSlider" value="20" min="0" max="500" step="1">
									<input type="number" id="pageMarginRightNumber" value="20" min="0" max="500">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="imageSpacingNumber">画像間のスペース (pt):</label>
								<div class="input-controls">
									<input type="range" id="imageSpacingSlider" value="10" min="0" max="50" step="1">
									<input type="number" id="imageSpacingNumber" value="10" min="0" max="50">
								</div>
							</div>
							<div class="inputs-wrapper">
								<label for="columnsNumber">列数 (0で自動):</label>
								<div class="input-controls">
									<input type="range" id="columnsSlider" value="0" min="0" max="5" step="1">
									<input type="number" id="columnsNumber" value="0" min="0" max="5">
								</div>
							</div>
						</div>
                    </details>
                </div>
                <div class="preview-main">
                    <button class="sidebar-toggle" id="sidebar-toggle">
                        <span class="bar"></span>
                        <span class="bar"></span>
                        <span class="bar"></span>
                    </button>
                    <h2>画像配置プレビュー</h2>
                    <div id="realtimePreviewContainer" class="realtime-preview-container">
                        <p>配置オプションを変更するとここにプレビューが表示されます。</p>
                    </div>
                    <div id="pdfPageCarousel" class="pdf-page-carousel"></div>
                    <div class="btn-wrap">
                        <a id="prevToPdfSelect" class="btn btn-stripe"><span>前へ</span></a>
                        <a id="embedButton" class="btn btn-stripe"><span>貼り付け</span></a>
                        <a id="nextToResult" class="btn btn-stripe"><span>次へ</span></a>
                    </div>
                </div>
            </div>
        `,
        onMount: () => {
            setupImageSelectListeners();
            setupOptionsListeners();
            setupPanelResizer();

            const sidebarToggle = getElement('sidebar-toggle');
            const optionsSidebar = getElement('options-sidebar-panel');
            const previewMain = document.querySelector('.preview-main');

            if (sidebarToggle && optionsSidebar && previewMain) {
                // 初期表示でサイドバーをアクティブにする
                sidebarToggle.classList.add('active');
                optionsSidebar.classList.add('active');
                previewMain.classList.add('sidebar-active');

                sidebarToggle.addEventListener('click', () => {
                    sidebarToggle.classList.toggle('active');
                    optionsSidebar.classList.toggle('active');
                    previewMain.classList.toggle('sidebar-active');
                });
            }
        }
    },
    '/result': {
        title: 'PCレポート作成 - 結果',
        className: 'page-result',
        render: () => `
            <h1>PDF処理結果</h1>
            <h2>PDFプレビュー</h2>
            <div id="pdfPreviewContainer">
                <p>PDFファイルを選択するとここにプレビューが表示されます。</p>
            </div>
            <div class="btn-wrap">
                <a id="downloadLink" class="btn btn-stripe" style="display:none;"><span>ダウンロード</span></a>
                <a id="restartApp" class="btn btn-stripe"><span>最初からやり直す</span></a>
            </div>
        `,
        onMount: setupResultListeners
    },
    '/about': {
        title: 'このアプリについて',
        className: 'page-about',
        render: () => `
            <h1>このアプリについて</h1>
            <p>このアプリケーションは、PDFファイルに複数の画像を貼り付けるためのツールです。</p>
            <p>画像の位置、サイズ、キャプションなどを調整して、オリジナルのPDFを作成できます。</p>
            <p>HEIC/HEIF形式の画像も自動的にJPEGに変換して処理します。</p>
        `,
        onMount: () => {
            // 特に初期化するイベントリスナーはない
        }
    }
};

export const router = () => {
    const path = window.location.hash.slice(1) || '/';
    const route = routes[path];

    // 既存のクラスをクリア
    app.className = '';

    if (route) {
        document.title = route.title;
        // 新しいクラスを追加
        if (route.className) {
            app.classList.add(route.className);
        }
        app.innerHTML = route.render();
        route.onMount(); // ビューがDOMに追加された後にイベントリスナーを設定
    } else {
        document.title = '404 Not Found';
        app.innerHTML = '<h1>404 Not Found</h1><p>お探しのページは見つかりませんでした。</p>';
    }
};

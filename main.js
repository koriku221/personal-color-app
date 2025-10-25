import { router } from './router.js';
import { getElement } from './utils.js';

// 初期ロード時とハッシュ変更時にルーターを実行
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
    router();

    const hamburgerMenu = getElement('hamburger-menu');
    const mainNav = getElement('main-nav');

    if (hamburgerMenu && mainNav) {
        hamburgerMenu.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            hamburgerMenu.classList.toggle('active');
        });

        // ナビゲーションリンクがクリックされたらメニューを閉じる
        mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mainNav.classList.remove('active');
                hamburgerMenu.classList.remove('active');
            });
        });
    }

    // ナビゲーションリンクにイベントリスナーを追加 (既存のロジック)
    const navHome = getElement('nav-home');
    const navAbout = getElement('nav-about');
    if (navHome) {
        navHome.addEventListener('click', () => {
            window.location.hash = '/';
        });
    }
    if (navAbout) {
        navAbout.addEventListener('click', () => {
            window.location.hash = '/about';
        });
    }
});

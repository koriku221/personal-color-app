import { router } from './router.js';
import { getElement } from './utils.js';

// ステップナビゲーションを更新する関数
const updateStepNavigation = () => {
    const path = window.location.hash.slice(1) || '/';
    console.log('Current path:', path); // 現在のパスをログ出力

    const stepNavItems = document.querySelectorAll('#step-nav .nav-item');

    stepNavItems.forEach(item => {
        item.classList.remove('active');
        item.classList.remove('complete'); // completeクラスもリセット
    });

    const stepOrder = ['pdf-select', 'image-select', 'result']; // ステップの順序を定義
    let currentStepIndex = -1;

    // 現在のパスに基づいてアクティブなナビゲーション項目を設定し、現在のステップのインデックスを特定
    if (path === '/' || path === '/pdf-select') {
        const element = getElement('nav-pdf-select');
        console.log('nav-pdf-select element:', element); // 要素の存在を確認
        element?.classList.add('active');
        currentStepIndex = stepOrder.indexOf('pdf-select');
    } else if (path === '/image-select') {
        const element = getElement('nav-image-select');
        console.log('nav-image-select element:', element); // 要素の存在を確認
        element?.classList.add('active');
        currentStepIndex = stepOrder.indexOf('image-select');
    } else if (path === '/result') {
        const element = getElement('nav-result');
        console.log('nav-result element:', element); // 要素の存在を確認
        element?.classList.add('active');
        currentStepIndex = stepOrder.indexOf('result');
    } else if (path === '/about') {
        const element = getElement('nav-about');
        console.log('nav-about element:', element); // 要素の存在を確認
        element?.classList.add('active');
    }

    // 現在のステップより前のステップにcompleteクラスを付与
    if (currentStepIndex !== -1) {
        for (let i = 0; i < currentStepIndex; i++) {
            const stepId = `nav-${stepOrder[i]}`;
            const element = getElement(stepId);
            console.log(`Complete element ${stepId}:`, element); // 要素の存在を確認
            element?.classList.add('complete');
        }
    }
};

// 初期ロード時とハッシュ変更時にルーターとステップナビゲーションを更新
window.addEventListener('hashchange', () => {
    router();
    updateStepNavigation();
});

window.addEventListener('DOMContentLoaded', () => {
    router();
    updateStepNavigation(); // 初期ロード時にも更新

    const hamburgerMenu = getElement('hamburger-menu');
    const mainNav = getElement('main-nav');
    console.log('hamburgerMenu element:', hamburgerMenu); // デバッグログ
    console.log('mainNav element:', mainNav); // デバッグログ

    if (hamburgerMenu && mainNav) {
        hamburgerMenu.addEventListener('click', () => {
            console.log('Hamburger menu clicked!'); // デバッグログ
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
});

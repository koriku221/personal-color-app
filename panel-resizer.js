import { getElement } from './utils.js';

export function setupPanelResizer() {
    const resizer = getElement('panel-resizer');
    const panel = getElement('options-sidebar-panel');
    if (!resizer || !panel) return;

    const handleMouseDown = (e) => {
        e.preventDefault();
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        const newHeight = window.innerHeight - e.clientY;
        const minHeight = 100; // パネルの最小高さ
        const maxHeight = window.innerHeight * 0.8; // パネルの最大高さ
        if (newHeight > minHeight && newHeight < maxHeight) {
            panel.style.height = `${newHeight}px`;
        }
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    resizer.addEventListener('mousedown', handleMouseDown);
}

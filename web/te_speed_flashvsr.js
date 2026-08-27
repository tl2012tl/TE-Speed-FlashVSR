import { app } from '../../scripts/app.js';
import { api } from '../../scripts/api.js';

function addVideoPreview(nodeType) {
    const originalCreated = nodeType.prototype.onNodeCreated;
    const originalExecuted = nodeType.prototype.onExecuted;

    nodeType.prototype.onNodeCreated = function () {
        originalCreated?.apply(this, arguments);
        const node = this;
        const root = document.createElement('div');
        root.style.width = '100%';
        const video = document.createElement('video');
        video.controls = true;
        video.loop = true;
        video.muted = true;
        video.style.width = '100%';
        video.style.display = 'none';
        root.appendChild(video);

        const widget = this.addDOMWidget('videopreview', 'preview', root, {
            serialize: false,
            hideOnZoom: false,
            getValue() { return root.value; },
            setValue(value) { root.value = value; },
        });
        widget.computeSize = function (width) {
            if (video.videoWidth && video.videoHeight && !video.hidden) {
                return [width, width * video.videoHeight / video.videoWidth + 10];
            }
            return [width, -4];
        };
        video.addEventListener('loadedmetadata', () => {
            video.style.display = 'block';
            node.setSize?.([Math.max(node.size?.[0] || 270, 270), node.size?.[1] || 300]);
            app.graph?.setDirtyCanvas?.(true, true);
        });
        video.addEventListener('error', () => {
            video.style.display = 'none';
            app.graph?.setDirtyCanvas?.(true, true);
        });
        node.__teVideoPreview = { widget, video, root };
    };

    nodeType.prototype.onExecuted = function (message) {
        originalExecuted?.apply(this, arguments);
        const entry = message?.gifs?.[0];
        const preview = this.__teVideoPreview;
        if (!entry || !preview) return;
        const params = new URLSearchParams({
            filename: entry.filename || '',
            subfolder: entry.subfolder || '',
            type: entry.type || 'output',
            format: 'video/mp4',
            t: String(Date.now()),
        });
        preview.root.value = entry;
        preview.video.src = api.apiURL('/view?' + params.toString());
        preview.video.load();
        preview.video.play().catch(() => {});
    };
}

app.registerExtension({
    name: 'TE.SpeedFlashVSR.VideoPreview',
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData?.name === 'TESpeedVideoCombine') {
            addVideoPreview(nodeType);
        }
    },
});

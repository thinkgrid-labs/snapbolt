(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/packages/snapbolt/pkg/snapbolt_bg.wasm (static in ecmascript)", ((__turbopack_context__) => {

__turbopack_context__.v("/_next/static/media/snapbolt_bg.56e8864b.wasm");}),
"[project]/packages/snapbolt/pkg/snapbolt.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* @ts-self-types="./snapbolt.d.ts" */ /**
 * @param {Uint8Array} input
 * @param {number} quality
 * @returns {Uint8Array}
 */ __turbopack_context__.s([
    "default",
    ()=>__wbg_init,
    "initSync",
    ()=>initSync,
    "optimize_image_sync",
    ()=>optimize_image_sync
]);
const __TURBOPACK__import$2e$meta__ = {
    get url () {
        return `file://${__turbopack_context__.P("packages/snapbolt/pkg/snapbolt.js")}`;
    }
};
function optimize_image_sync(input, quality) {
    const ptr0 = passArray8ToWasm0(input, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.optimize_image_sync(ptr0, len0, quality);
    if (ret[3]) {
        throw takeFromExternrefTable0(ret[2]);
    }
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
}
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return ret;
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        }
    };
    return {
        __proto__: null,
        "./snapbolt_bg.js": import0
    };
}
function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}
function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}
function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
let cachedTextDecoder = new TextDecoder('utf-8', {
    ignoreBOM: true,
    fatal: true
});
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', {
            ignoreBOM: true,
            fatal: true
        });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
let WASM_VECTOR_LEN = 0;
let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}
async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);
                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                } else {
                    throw e;
                }
            }
        }
        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);
        if (instance instanceof WebAssembly.Instance) {
            return {
                instance,
                module
            };
        } else {
            return instance;
        }
    }
    function expectedResponseType(type) {
        switch(type){
            case 'basic':
            case 'cors':
            case 'default':
                return true;
        }
        return false;
    }
}
function initSync(module) {
    if (wasm !== undefined) return wasm;
    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({ module } = module);
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
        }
    }
    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}
async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;
    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({ module_or_path } = module_or_path);
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead');
        }
    }
    if (module_or_path === undefined) {
        module_or_path = new __turbopack_context__.U(__turbopack_context__.r("[project]/packages/snapbolt/pkg/snapbolt_bg.wasm (static in ecmascript)"));
    }
    const imports = __wbg_get_imports();
    if (typeof module_or_path === 'string' || typeof Request === 'function' && module_or_path instanceof Request || typeof URL === 'function' && module_or_path instanceof URL) {
        module_or_path = fetch(module_or_path);
    }
    const { instance, module } = await __wbg_load(await module_or_path, imports);
    return __wbg_finalize_init(instance, module);
}
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/snapbolt/src/useImageOptimizer.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useImageOptimizer",
    ()=>useImageOptimizer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$pkg$2f$snapbolt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/pkg/snapbolt.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
const resizeImage = async (blob, maxWidth, maxHeight)=>{
    if (!maxWidth && !maxHeight) return blob;
    return new Promise((resolve, reject)=>{
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.src = url;
        img.onload = ()=>{
            URL.revokeObjectURL(url);
            let width = img.width;
            let height = img.height;
            if (maxWidth && width > maxWidth) {
                height = Math.round(height * maxWidth / width);
                width = maxWidth;
            }
            if (maxHeight && height > maxHeight) {
                width = Math.round(width * maxHeight / height);
                height = maxHeight;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((b)=>{
                if (b) resolve(b);
                else reject(new Error('Canvas toBlob failed'));
            }, blob.type);
        };
        img.onerror = ()=>{
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image for resizing'));
        };
    });
};
const useImageOptimizer = function(src) {
    let optionsOrQuality = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    _s();
    const options = typeof optionsOrQuality === 'number' ? {
        quality: optionsOrQuality
    } : optionsOrQuality;
    const { quality = 80, crossOrigin, wasmUrl, width, height, cache = true } = options;
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        optimizedUrl: null,
        loading: false,
        error: null
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useImageOptimizer.useEffect": ()=>{
            let mounted = true;
            let currentUrl = null;
            const process = {
                "useImageOptimizer.useEffect.process": async ()=>{
                    if (!src) return;
                    setState({
                        "useImageOptimizer.useEffect.process": (prev)=>({
                                ...prev,
                                loading: true,
                                error: null
                            })
                    }["useImageOptimizer.useEffect.process"]);
                    try {
                        const cacheKey = typeof src === 'string' ? "snapbolt:".concat(src, ":").concat(quality, ":").concat(width || '', ":").concat(height || '') : null;
                        if (cache && cacheKey && 'caches' in window) {
                            try {
                                const cacheStorage = await caches.open('snapbolt-v1');
                                const cachedResponse = await cacheStorage.match(cacheKey);
                                if (cachedResponse) {
                                    const cachedBlob = await cachedResponse.blob();
                                    const url = URL.createObjectURL(cachedBlob);
                                    currentUrl = url;
                                    if (mounted) setState({
                                        optimizedUrl: url,
                                        loading: false,
                                        error: null
                                    });
                                    return;
                                }
                            } catch (e) {
                                console.warn('Snapbolt Cache Error:', e);
                            }
                        }
                        let blob;
                        if (typeof src === 'string') {
                            const fetchOpts = {};
                            if (crossOrigin === 'use-credentials') fetchOpts.credentials = 'include';
                            else if (crossOrigin === 'anonymous') fetchOpts.credentials = 'same-origin';
                            const resp = await fetch(src, fetchOpts);
                            if (!resp.ok) throw new Error("Failed to fetch image: ".concat(resp.statusText));
                            const contentType = resp.headers.get('Content-Type');
                            if (contentType && ![
                                'image/jpeg',
                                'image/jpg',
                                'image/png',
                                'image/webp'
                            ].some({
                                "useImageOptimizer.useEffect.process": (t)=>contentType.includes(t)
                            }["useImageOptimizer.useEffect.process"])) {
                                console.warn("Snapbolt: Unsupported Content-Type ".concat(contentType, ", skipping optimization."));
                                if (mounted) setState({
                                    optimizedUrl: src,
                                    loading: false,
                                    error: null
                                });
                                return;
                            }
                            blob = await resp.blob();
                        } else {
                            blob = src;
                        }
                        if (width || height) blob = await resizeImage(blob, width, height);
                        const buffer = await blob.arrayBuffer();
                        const bytes = new Uint8Array(buffer);
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$pkg$2f$snapbolt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"])(wasmUrl);
                        const optimizedBytes = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$pkg$2f$snapbolt$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["optimize_image_sync"])(bytes, quality);
                        const optimizedBlob = new Blob([
                            optimizedBytes
                        ], {
                            type: 'image/webp'
                        });
                        if (cache && cacheKey && 'caches' in window) {
                            try {
                                const cacheStorage = await caches.open('snapbolt-v1');
                                await cacheStorage.put(cacheKey, new Response(optimizedBlob, {
                                    headers: new Headers({
                                        'Content-Type': 'image/webp'
                                    })
                                }));
                            } catch (e) {
                                console.warn('Snapbolt Cache Write Error:', e);
                            }
                        }
                        const url = URL.createObjectURL(optimizedBlob);
                        currentUrl = url;
                        if (mounted) setState({
                            optimizedUrl: url,
                            loading: false,
                            error: null
                        });
                    } catch (err) {
                        console.error('Snapbolt Optimization Failed:', err);
                        if (mounted) {
                            setState({
                                optimizedUrl: typeof src === 'string' ? src : null,
                                loading: false,
                                error: err.message || 'Unknown error'
                            });
                        }
                    }
                }
            }["useImageOptimizer.useEffect.process"];
            process();
            return ({
                "useImageOptimizer.useEffect": ()=>{
                    mounted = false;
                    if (currentUrl) URL.revokeObjectURL(currentUrl);
                }
            })["useImageOptimizer.useEffect"];
        }
    }["useImageOptimizer.useEffect"], [
        src,
        quality,
        crossOrigin,
        wasmUrl,
        width,
        height,
        cache
    ]);
    return state;
};
_s(useImageOptimizer, "JZyQJrNFpti18dbxvHehPp8ghdM=");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/snapbolt/src/context.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SnapboltProvider",
    ()=>SnapboltProvider,
    "useSnapboltConfig",
    ()=>useSnapboltConfig
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
const SnapboltContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({});
function SnapboltProvider(param) {
    let { children, serverUrl, defaultQuality, defaultFormat, breakpoints } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SnapboltContext.Provider, {
        value: {
            serverUrl,
            defaultQuality,
            defaultFormat,
            breakpoints
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/packages/snapbolt/src/context.tsx",
        lineNumber: 55,
        columnNumber: 9
    }, this);
}
_c = SnapboltProvider;
function useSnapboltConfig() {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(SnapboltContext);
}
_s(useSnapboltConfig, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
var _c;
__turbopack_context__.k.register(_c, "SnapboltProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/snapbolt/src/SmartImage.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "SmartImage",
    ()=>SmartImage,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/context.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$useImageOptimizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/useImageOptimizer.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
'use client';
;
;
;
// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_BREAKPOINTS = [
    640,
    1080,
    1920
];
// ─── Server-URL builder ───────────────────────────────────────────────────────
function serverUrl(base, src, w, q, fmt) {
    const params = new URLSearchParams({
        url: src,
        w: String(w),
        q: String(q),
        fmt
    });
    return "".concat(base.replace(/\/$/, ''), "/image?").concat(params);
}
function buildSrcSet(base, src, widths, q, fmt) {
    return widths.map((w)=>"".concat(serverUrl(base, src, w, q, fmt), " ").concat(w, "w")).join(', ');
}
// ─── Wrapper styles ───────────────────────────────────────────────────────────
function wrapperStyle(fill, width, height) {
    if (fill) {
        return {
            position: 'relative',
            display: 'block',
            width: '100%',
            height: '100%',
            overflow: 'hidden'
        };
    }
    const style = {
        position: 'relative',
        display: 'block'
    };
    if (width) style.width = width;
    if (width && height) style.aspectRatio = "".concat(width, " / ").concat(height);
    return style;
}
// ─── Blur overlay ─────────────────────────────────────────────────────────────
function BlurOverlay(param) {
    let { dataUrl, visible } = param;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
        src: dataUrl,
        "aria-hidden": "true",
        alt: "",
        style: {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.05)',
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none'
        }
    }, void 0, false, {
        fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
        lineNumber: 130,
        columnNumber: 9
    }, this);
}
_c = BlurOverlay;
// ─── Server-mode component ────────────────────────────────────────────────────
// Builds proper src/srcset URLs pointing at snapbolt-server.
// No WASM, no async processing — the browser fetches a pre-optimized image.
// This is the fast path for Lighthouse / LCP.
function SmartImageServer(param) {
    let { src, alt, width, height, quality, format, priority, sizes, placeholder, blurDataURL, fill, serverUrl: serverUrlProp, breakpoints, className, style, onLoad, onError, ...rest } = param;
    _s();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSnapboltConfig"])();
    const base = serverUrlProp !== null && serverUrlProp !== void 0 ? serverUrlProp : ctx.serverUrl;
    var _ref;
    const q = (_ref = quality !== null && quality !== void 0 ? quality : ctx.defaultQuality) !== null && _ref !== void 0 ? _ref : 80;
    var _ref1;
    const fmt = (_ref1 = format !== null && format !== void 0 ? format : ctx.defaultFormat) !== null && _ref1 !== void 0 ? _ref1 : 'auto';
    var _ref2;
    const bps = (_ref2 = breakpoints !== null && breakpoints !== void 0 ? breakpoints : ctx.breakpoints) !== null && _ref2 !== void 0 ? _ref2 : DEFAULT_BREAKPOINTS;
    // Build srcset — include all breakpoints ≤ width (if width given), plus width itself
    const srcsetWidths = width ? [
        ...new Set([
            ...bps.filter((w)=>w <= width * 1.5),
            width
        ])
    ].sort((a, b)=>a - b) : bps;
    const primarySrc = serverUrl(base, src, width !== null && width !== void 0 ? width : srcsetWidths[srcsetWidths.length - 1], q, fmt);
    const srcSet = buildSrcSet(base, src, srcsetWidths, q, fmt);
    const sizesAttr = sizes !== null && sizes !== void 0 ? sizes : '100vw';
    // Blur placeholder state
    const [imgLoaded, setImgLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const showBlur = placeholder === 'blur' && !!blurDataURL && !imgLoaded;
    // Inject <link rel="preload"> for priority images — tells browser to fetch early
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "SmartImageServer.useEffect": ()=>{
            if (!priority || typeof document === 'undefined') return;
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = primarySrc;
            link.setAttribute('imagesrcset', srcSet);
            link.setAttribute('imagesizes', sizesAttr);
            link.setAttribute('fetchpriority', 'high');
            document.head.appendChild(link);
            return ({
                "SmartImageServer.useEffect": ()=>{
                    document.head.removeChild(link);
                }
            })["SmartImageServer.useEffect"];
        }
    }["SmartImageServer.useEffect"], [
        priority,
        primarySrc,
        srcSet,
        sizesAttr
    ]);
    const imgStyle = fill ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    } : {
        display: 'block',
        maxWidth: '100%',
        height: 'auto'
    };
    if (placeholder === 'blur' && blurDataURL) {
        imgStyle.opacity = imgLoaded ? 1 : 0;
        imgStyle.transition = 'opacity 0.4s ease';
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        style: wrapperStyle(fill, width, height),
        children: [
            placeholder === 'blur' && blurDataURL && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BlurOverlay, {
                dataUrl: blurDataURL,
                visible: showBlur
            }, void 0, false, {
                fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
                lineNumber: 220,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                ...rest,
                src: primarySrc,
                srcSet: srcSet,
                sizes: sizesAttr,
                width: fill ? undefined : width,
                height: fill ? undefined : height,
                alt: alt,
                loading: priority ? 'eager' : 'lazy',
                decoding: "async",
                ...priority ? {
                    fetchPriority: 'high'
                } : {},
                className: className,
                style: {
                    ...imgStyle,
                    ...style
                },
                onLoad: ()=>{
                    setImgLoaded(true);
                    onLoad === null || onLoad === void 0 ? void 0 : onLoad();
                },
                onError: onError
            }, void 0, false, {
                fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
                lineNumber: 222,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
        lineNumber: 218,
        columnNumber: 9
    }, this);
}
_s(SmartImageServer, "hQLCjK0ybEbXfYla/VUu5RX0pfQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSnapboltConfig"]
    ];
});
_c1 = SmartImageServer;
// ─── WASM-mode component ──────────────────────────────────────────────────────
// Falls back to client-side WASM optimization when no server is configured.
// Good for Blob/File inputs (e.g. pre-upload preview). For URL-based images
// in production, configure a serverUrl via SnapboltProvider for best LCP.
function SmartImageWasm(param) {
    let { src, alt, width, height, quality, format: _format, priority, sizes, placeholder, blurDataURL, fill, className, style, onLoad, onError, ...rest } = param;
    _s1();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSnapboltConfig"])();
    var _ref;
    const q = (_ref = quality !== null && quality !== void 0 ? quality : ctx.defaultQuality) !== null && _ref !== void 0 ? _ref : 80;
    const { optimizedUrl, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$useImageOptimizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useImageOptimizer"])(src, {
        quality: q,
        width,
        height
    });
    const [imgLoaded, setImgLoaded] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const showBlur = placeholder === 'blur' && !!blurDataURL && !imgLoaded;
    const imgStyle = fill ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    } : {
        display: 'block',
        maxWidth: '100%',
        height: 'auto'
    };
    if (placeholder === 'blur' && blurDataURL) {
        imgStyle.opacity = imgLoaded ? 1 : 0;
        imgStyle.transition = 'opacity 0.4s ease';
    }
    if (loading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            style: {
                ...wrapperStyle(fill, width, height),
                background: 'linear-gradient(90deg,#f0f0f0 25%,#e4e4e4 50%,#f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'snapbolt-shimmer 1.4s infinite',
                display: 'block'
            },
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: "@keyframes snapbolt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}"
            }, void 0, false, {
                fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
                lineNumber: 293,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
            lineNumber: 284,
            columnNumber: 13
        }, this);
    }
    if (!optimizedUrl) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        style: wrapperStyle(fill, width, height),
        children: [
            placeholder === 'blur' && blurDataURL && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(BlurOverlay, {
                dataUrl: blurDataURL,
                visible: showBlur
            }, void 0, false, {
                fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
                lineNumber: 303,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                ...rest,
                src: optimizedUrl,
                alt: alt,
                width: fill ? undefined : width,
                height: fill ? undefined : height,
                loading: priority ? 'eager' : 'lazy',
                decoding: "async",
                ...priority ? {
                    fetchPriority: 'high'
                } : {},
                sizes: sizes,
                className: className,
                style: {
                    ...imgStyle,
                    ...style
                },
                onLoad: ()=>{
                    setImgLoaded(true);
                    onLoad === null || onLoad === void 0 ? void 0 : onLoad();
                },
                onError: onError
            }, void 0, false, {
                fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
                lineNumber: 305,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
        lineNumber: 301,
        columnNumber: 9
    }, this);
}
_s1(SmartImageWasm, "IEUd7eMr6B5/RYiRaFYD367gk3k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSnapboltConfig"],
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$useImageOptimizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useImageOptimizer"]
    ];
});
_c2 = SmartImageWasm;
function SmartImage(props) {
    _s2();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSnapboltConfig"])();
    var _props_serverUrl;
    const effectiveServerUrl = (_props_serverUrl = props.serverUrl) !== null && _props_serverUrl !== void 0 ? _props_serverUrl : ctx.serverUrl;
    // Server mode: src must be a string URL when routing through the server
    if (effectiveServerUrl && typeof props.src === 'string') {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SmartImageServer, {
            ...props,
            src: props.src,
            serverUrl: effectiveServerUrl
        }, void 0, false, {
            fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
            lineNumber: 380,
            columnNumber: 13
        }, this);
    }
    // WASM mode: handles both string URLs and Blob/File
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SmartImageWasm, {
        ...props
    }, void 0, false, {
        fileName: "[project]/packages/snapbolt/src/SmartImage.tsx",
        lineNumber: 389,
        columnNumber: 12
    }, this);
}
_s2(SmartImage, "qW/8W8t3NRQd/rNkNEUlH0GwbkM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSnapboltConfig"]
    ];
});
_c3 = SmartImage;
const __TURBOPACK__default__export__ = SmartImage;
var _c, _c1, _c2, _c3;
__turbopack_context__.k.register(_c, "BlurOverlay");
__turbopack_context__.k.register(_c1, "SmartImageServer");
__turbopack_context__.k.register(_c2, "SmartImageWasm");
__turbopack_context__.k.register(_c3, "SmartImage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/packages/snapbolt/src/index.ts [app-client] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

// Hook (primary client-side WASM optimizer)
__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$useImageOptimizer$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/useImageOptimizer.ts [app-client] (ecmascript)");
// SmartImage component + provider
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$SmartImage$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/SmartImage.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/context.tsx [app-client] (ecmascript)");
;
;
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/examples/nextjs/components/Providers.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Providers
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/examples/nextjs/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/index.ts [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/packages/snapbolt/src/context.tsx [app-client] (ecmascript)");
'use client';
;
;
function Providers(param) {
    let { children } = param;
    var _process_env_NEXT_PUBLIC_SNAPBOLT_SERVER_URL;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$packages$2f$snapbolt$2f$src$2f$context$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SnapboltProvider"], {
        serverUrl: (_process_env_NEXT_PUBLIC_SNAPBOLT_SERVER_URL = __TURBOPACK__imported__module__$5b$project$5d2f$examples$2f$nextjs$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_SNAPBOLT_SERVER_URL) !== null && _process_env_NEXT_PUBLIC_SNAPBOLT_SERVER_URL !== void 0 ? _process_env_NEXT_PUBLIC_SNAPBOLT_SERVER_URL : '/api',
        defaultQuality: 80,
        defaultFormat: "auto",
        breakpoints: [
            640,
            1080,
            1920
        ],
        children: children
    }, void 0, false, {
        fileName: "[project]/examples/nextjs/components/Providers.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Providers;
var _c;
__turbopack_context__.k.register(_c, "Providers");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=_e6dfb805._.js.map
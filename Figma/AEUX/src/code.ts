import { analyzeNodes } from './validation';
import { sanitizeLayerName } from './naming';

figma.showUI(__html__, { width: 166, height: 220 });
let hasFrameData;
let shapeTree = []
let imageHashList = []
let imageBytesList = []
let rasterizeList = []
let prefs = {
    exportRefImage: false,
    imgSaveDialog: false,
}

// receive message from the UI
figma.ui.onmessage = message => {
    if (message.type === 'getPrefs') {
        // console.log('get those prefs');
        
        figma.clientStorage.getAsync('aeux.prefs')
        .then(prefs => {
            if (prefs) {
                figma.ui.postMessage({ type: 'retPrefs', prefs: prefs })
                return prefs
            } else {
                // console.log('gotta save new prefs', message.defaultPrefs);
                figma.clientStorage.setAsync('aeux.prefs', message.defaultPrefs)
                .then(() => {
                    figma.ui.postMessage({ type: 'retPrefs', prefs: message.defaultPrefs})
                })
                return message.defaultPrefs
            }
        })
        .then(userPrefs => {        // store the prefs locally
            prefs = userPrefs
        })
    }
    if (message.type === 'setPrefs') {
        // console.log('save those prefs', message.prefs);
        
        figma.clientStorage.setAsync('aeux.prefs', message.prefs)
        .then(ret => {
            figma.ui.postMessage(message.prefs)
            prefs = message.prefs        // store the prefs locally
        })
        
    }

    if (message.type === 'exportCancel') {

    }
	if (message.type === 'validateSelection') {
        if (figma.currentPage.selection.length < 1) {
            figma.ui.postMessage({ type: 'validationResult', result: null });
            return;
        }
        const result = analyzeNodes(figma.currentPage.selection);
        figma.ui.postMessage({ type: 'validationResult', result });
        return;
    }
	if (message.type === 'exportSelection') {
        hasFrameData = false;
        shapeTree = []
        imageHashList = []
        imageBytesList = []
        rasterizeList = []
        let exportJSON = false
        if (message.exportJSON) { exportJSON = true}

        // nothing selected
        if (figma.currentPage.selection.length < 1) {
            figma.ui.postMessage({ type: 'fetchAEUX', data: null });
            return
        }

        // pre-export validation: send warnings to UI but don't block export
        const validation = analyzeNodes(figma.currentPage.selection);
        if (validation.warnings.length > 0 || validation.errors.length > 0) {
            figma.ui.postMessage({ type: 'validationResult', result: validation });
        }
        if (!validation.canExport) { return }

        try {
            // pre-process the selected shapes hierarchy
            let selection = nodeToObj(figma.currentPage.selection);                

            if (shapeTree[0].children.length < 1) {
                shapeTree[0].children = selection;
            }
            // console.log('shapeTree: ', shapeTree);
        } catch (error) {
            console.log(error);
            console.log('selected layers need to be inside of a frame');
            figma.ui.postMessage({type: 'footerMsg', action: 'Layers must be inside of a frame', layerCount: null});
        }

        let refImg = null, tempGroup, parentFrame
        if (prefs.exportRefImage) {         // include a reference image with transfer
            parentFrame = findFrame(figma.currentPage.selection[0])
            if (!parentFrame) return
            let parentFrameName = parentFrame.name.replace(/\s*(\/|\\)\s*/g, '-').replace(/^\*\s/, '').replace(/^\*/, '')

            rasterizeList.push(parentFrame.id)

            refImg = {
                type: 'Image',
                name: parentFrameName,
                id: parentFrame.id.replace(/:/g, '-'),
                frame: { x: parentFrame.width / 2, y: parentFrame.height / 2, width: parentFrame.width, height: parentFrame.height},
                isVisible: true,
                opacity: 50,
                blendMode: 'BlendingMode.NORMAL',
                isMask: false,
                rotation: 0,
                guide: true,
            }
        }
        
        if (rasterizeList.length > 0) {
            rasterizeList = [... new Set(rasterizeList)]        // remove duplicates
            // console.log('RASTERIZELIST', rasterizeList);


            let requests = rasterizeList.map((item) => {
                console.log('iten++', item);
                
                return new Promise((resolve) => {
                    asyncCollectHashes(item, resolve);
                });
            })

            Promise.all(requests)
            .then(() => storeImageData(imageHashList, shapeTree, refImg))
                

        } else {
            // check if images need to export then send message to ui.ts
            if (exportJSON) {                
                figma.ui.postMessage({ type: 'exportAEUX', data: shapeTree }); 
            } else if (imageHashList.length < 1) {
                figma.ui.postMessage({ type: 'fetchAEUX', data: shapeTree });
            } else {
                storeImageData(imageHashList, shapeTree, null)
            }
        }
        // console.log('imageHashList', imageHashList);

    }

    if (message.type === 'exportPalette') {
        if (figma.currentPage.selection.length < 1) {
            figma.ui.postMessage({ type: 'paletteFetched', data: null });
            return;
        }
        shapeTree = []
        hasFrameData = false
        try {
            let selection = nodeToObj(figma.currentPage.selection)
            if (shapeTree[0].children.length < 1) {
                shapeTree[0].children = selection
            }
        } catch (error) {
            figma.ui.postMessage({ type: 'footerMsg', action: 'Layers must be inside of a frame', layerCount: null });
            return;
        }
        figma.ui.postMessage({ type: 'paletteFetched', data: shapeTree });
        return;
    }

    if (message.type === 'addRasterizeFlag') {
        if (figma.currentPage.selection.length < 1) { return }      // nothing selected

        // let selection = nodeToObj(figma.currentPage.selection)
        let layerCount = addMagicStar(figma.currentPage.selection, 0) || 0

        // reselect layers
        figma.currentPage.selection = figma.currentPage.selection

        figma.ui.postMessage({type: 'footerMsg', action: 'marked as PNG', layerCount});
    }
    // if (message.type === 'flattenLayers') {
    //     if (figma.currentPage.selection.length < 1) { return }      // nothing selected

    //     // let selection = nodeToObj(figma.currentPage.selection)
    //     let layerCount = flattenRecursive(figma.currentPage.selection, 0) || 0

    //     // reselect layers
    //     figma.currentPage.selection = figma.currentPage.selection

    //     figma.ui.postMessage({type: 'footerMsg', action: 'flattened', layerCount});
    // }
    // if (message.type === 'rasterizeSelection') {
    //     if (figma.currentPage.selection.length < 1) { return }      // nothing selected

    //     // let selection = nodeToObj(figma.currentPage.selection)
    //     let layerCount = rasterizeSelection(figma.currentPage.selection, 0) || 0
    //     // console.log('layerCount', layerCount);

    //     // reselect layers
    //     figma.currentPage.selection = figma.currentPage.selection

    //     figma.ui.postMessage({type: 'footerMsg', action: 'rasterized', layerCount});
    // }
    // if (message.type === 'detachComponents') {
    //     console.log('detachComponents');
    //     let layerCount = 4;
    //     figma.ui.postMessage({type: 'footerMsg', action: 'flattened', layerCount});
    // }

    if (message.type === 'sendRefImageOnly') {
        if (figma.currentPage.selection.length < 1) {
            figma.ui.postMessage({ type: 'fetchAEUX', data: null });
            return;
        }

        shapeTree = []
        imageHashList = []
        imageBytesList = []
        rasterizeList = []
        hasFrameData = false

        let parentFrame = findFrame(figma.currentPage.selection[0])
        if (!parentFrame) return
        let parentFrameName = parentFrame.name.replace(/\s*(\/|\\)\s*/g, '-').replace(/^\*\s/, '').replace(/^\*/, '')

        rasterizeList.push(parentFrame.id)

        let frameObj: any = {
            type: 'FRAME',
            name: parentFrameName,
            id: parentFrame.id,
            frame: { x: 0, y: 0, width: parentFrame.width, height: parentFrame.height },
            width: parentFrame.width,
            height: parentFrame.height,
            absoluteTransform: [[1, 0, parentFrame.absoluteTransform[0][2]], [0, 1, parentFrame.absoluteTransform[1][2]]],
            backgrounds: parentFrame.backgrounds || [],
            children: [],
            isVisible: true,
            opacity: 100,
            blendMode: 'BlendingMode.NORMAL',
            isMask: false,
            rotation: 0,
        }
        shapeTree.push(frameObj)

        let refImg = {
            type: 'Image',
            name: parentFrameName,
            id: parentFrame.id.replace(/:/g, '-'),
            frame: { x: parentFrame.width / 2, y: parentFrame.height / 2, width: parentFrame.width, height: parentFrame.height },
            isVisible: true,
            opacity: 50,
            blendMode: 'BlendingMode.NORMAL',
            isMask: false,
            rotation: 0,
            guide: true,
        }

        let requests = rasterizeList.map((item) => {
            return new Promise((resolve) => {
                asyncCollectHashes(item, resolve);
            });
        })

        Promise.all(requests)
        .then(() => storeImageData(imageHashList, shapeTree, refImg))
    }

	//Communicate back to the UI
	// console.log('send message back to ui');
}

function clone(val) {
    return JSON.parse(JSON.stringify(val))
}

function asyncCollectHashes(id, cb) {
    setTimeout(() => {
        let shape = (figma.getNodeById(id) as any)
        if (!shape) { cb(); return; }

        let compMult = 3
        let imgScale = Math.min(3500 / Math.max(shape.width, shape.height), compMult)

        let fontPromise: Promise<any> = Promise.resolve()
        if (shape.type === 'TEXT') {
            try {
                const fn = shape.fontName
                if (fn !== figma.mixed && fn != null && typeof (fn as any).family === 'string') {
                    fontPromise = figma.loadFontAsync(fn as FontName)
                } else if (fn === figma.mixed) {
                    const fonts: FontName[] = []
                    for (let i = 0; i < (shape.characters as string).length; i++) {
                        const rfn = shape.getRangeFontName(i, i + 1)
                        if (rfn !== figma.mixed) {
                            const f = rfn as FontName
                            if (!fonts.some(x => x.family === f.family && x.style === f.style)) {
                                fonts.push(f)
                            }
                        }
                    }
                    fontPromise = Promise.all(fonts.map(f => figma.loadFontAsync(f))).then(() => {})
                }
            } catch (e) { /* continue without font load */ }
        }

        fontPromise
        .catch(() => {})
        .then(() => {
            let effectVisList = []
            let effects
            if (shape.effects) {
                effects = clone(shape.effects)
                effects.forEach(effect => {
                    effectVisList.push(effect.visible)
                    if (effect.type == 'DROP_SHADOW' || effect.type == 'LAYER_BLUR') {
                        effect.visible = false
                    }
                })
                try { shape.effects = effects } catch (e) {}
            }

            return shape.exportAsync({
                format: "PNG",
                useAbsoluteBounds: true,
                constraint: { type: "SCALE", value: imgScale }
            })
            .then(img => {
                imageHashList.push({
                    hash: figma.createImage(img).hash,
                    id: `${shape.name.replace(/^\*\s/, '').replace(/^\*/, '')}_${id}`
                })
            })
            .then(() => {
                if (effects) {
                    for (let i = 0; i < effectVisList.length; i++) {
                        effects[i].visible = effectVisList[i]
                    }
                    try { shape.effects = effects } catch (e) {}
                }
            })
            .then(() => { cb() })
        })

    }, 100);
}

function nodeToObj (nodes) {
//   console.log('nodes', nodes);
  
  if (nodes.length < 1) { return [] }

  
    // console.log(nodes[0].type);
    let arr = [];

    // look for the parent frame of everything except regular (non-autoLayout) frames and loose components
    if (nodes[0] && (
        (nodes[0].type === 'FRAME' && nodes[0].parent.type === 'PAGE') || 
        // (nodes[0].type === 'FRAME' && nodes[0].layoutMode === 'NONE') || 
        (nodes[0].type === 'COMPONENT' && nodes[0].parent.type === 'PAGE' ) )) {            // a frame or a component master outside of a frame is directly selected
        
            console.log('GOT A FRAME');
        // console.log(nodes[0].children);
        hasFrameData = true     // dont need to get the frame data
        shapeTree.push( getElement(nodes[0], false) );
        nodes = nodes[0].children
    }

    // get shapes 
    if (nodes.length < 1) { return [] }
    nodes.forEach(node => {
        // get the frame data

        if (!hasFrameData) {
            if (node.parent.type === 'PAGE') { return }     // layer is outside of a frame 

            // console.log('get the frame data');
            let frame = findFrame(node);
            
            // console.log('frame:', frame);
            let frameData = getElement(frame, true);    // skip gathering children data
            frameData.children = [];                    // clear the children of the frame to push them later

            shapeTree.push(frameData);
        }

        let obj = getElement(node, false)
        
        arr.push(obj);
    });
    // console.log('arr: ', arr);
    
    return arr;
    

    
    function getElement(node, skipChildren) {
        // console.log('node', node.name);
        
        let rasterize = false
        let obj = {
            children: [],
            type: null,
        };        
        if (node.name && node.name.charAt(0) == '*' && node != findFrame(node)) {
            console.log('rasterize', node);
            rasterizeList.push(node.id)
            rasterize = true
        }

        for (const key in node) {
            try {
                
            
            let element = node[key];
            // console.log(element);
            
            if (key === 'children' && !skipChildren && !rasterize) { element = nodeToObj(element) }
            if (key === 'backgrounds') { element = nodeToObj(element) }
            if (key === 'fills' && element.length > 0) {        // add image fills to rasterizeList
                let hasImageFill = false
                for (const i in element) {
                    const fill = element[i];                    
                    if (fill.type == 'IMAGE') {
                        hasImageFill = true
                        obj['rasterize'] = true
                        // console.log('image', element);
                        // obj.type = 'RECTANGLE'
                        // return
                    }
                }
                if (hasImageFill) { rasterizeList.push(node.id) }
            }

            // corner radius
            // if (key === 'cornerRadius') {
            //     console.log(key,  element);

            // }
            if (element == figma.mixed && key === 'cornerRadius') {                
                element = Math.min(node.topLeftRadius, node.topRightRadius, node.bottomLeftRadius, node.bottomRightRadius);
            } 

            // try to get the first value on the text
            if (element == figma.mixed) {
                let str = 'getRange' + key.replace(/^\w/, c => c.toUpperCase())
                try {
                    element = node[str](0,1)
                } catch (error) {
                    continue
                }
            } 

            // layer.fontName !== (figma.mixed)) ? layer.fontName.family : layer.getRangeFontName(0,1).family
            // if (key === 'parent') { console.log(element); }
            
            obj[key] = element;  

            } catch (error) {
                console.log('ERROR', error);
                
            }          
        }
        // sanitize layer name for After Effects compatibility
        if ((obj as any).name) {
            (obj as any).name = sanitizeLayerName((obj as any).name as string);
        }

        // set type AFTER the loop so nothing can overwrite it
        if (rasterize) {
            obj.type = 'RASTERIZE';
        } else if (node.type === 'FRAME' && node.layoutMode !== 'NONE') {
            obj.type = 'AUTOLAYOUT';
        }

        return obj;
    }

    function collectImageHashes(element, id) {
        // console.log('imageHash', id, element);
        for (const i in element) {
            const fill = element[i];
            if (fill.type == 'IMAGE') {
                imageHashList.push({hash: fill.imageHash, id})
            }
        }
    }

}

async function storeImageData(imageHashList, layers, refImg) { // imageHashList should be fiiled but isnt
    // console.log('layers++', layers);
    // console.log('imageHashList++', imageHashList);
    
    for (const i in imageHashList) {
        // console.log('i', i);
        const hash = imageHashList[i].hash;
        // console.log('hash', hash);
        
        const name = imageHashList[i].id
            .replace(/[\\:"*?%<>|]/g, '-')     // replace illegal characters
            .replace(/\s*(\/|\\)\s*/g, '-')    // remove slashes
        // console.log('name', name);

        try {
            let image = figma.getImageByHash(hash)            
            let bytes = await image.getBytesAsync()

            imageBytesList.push({ name, bytes })
            // console.log('bytes', bytes);
        } catch (error) {}
    }
    if (imageBytesList.length > 0) {
        figma.ui.postMessage({type: 'fetchImagesAndAEUX', images: imageBytesList, data: layers, refImg});
    } else {
        figma.ui.postMessage({ type: 'fetchAEUX', data: layers });
    }
    
}
function findFrame(node) {
    // console.log('node:', node);
    // console.log('node.type:', node.type);
    try {
        if ((node.type !== 'FRAME' && !(node.type === 'COMPONENT' && node.parent.type === 'PAGE'))
        || (node.type === 'FRAME' && node.parent.type === 'FRAME')) {
            // if (node.type !== 'FRAME' && node.type !== 'COMPONENT') {                
                return findFrame(node.parent);
            } else {
                hasFrameData = true;                
                return node;
            }
        } catch (error) {
            figma.ui.postMessage({ type: 'footerMsg', action: 'Selection must be inside a frame', layerCount: null });
            return null;
        }
}
function addMagicStar(selection, layerCount) {
    if (findFrame(selection[0]) == selection[0] ) {     // selection is the top most frame
        selection = selection[0].children               // select all the children
    }
        
    selection.forEach(shape => {
        if (shape.name.charAt(0) !== '*') {
            shape.name = `* ${shape.name}`
            layerCount++
        }
    })

    return layerCount
}
function flattenRecursive(selection, layerCount) {            
    try {
        selection.forEach(shape => {
            console.log('try flattening', shape);
            
            if (shape.type == 'BOOLEAN_OPERATION') {
                figma.flatten( [shape] )
                layerCount ++
            } else if (shape.cornerRadius == figma.mixed || shape.cornerRadius > 0) {
                // flatten rounded corners
                figma.flatten([shape])
                layerCount++
            } else if (shape.children) {
                layerCount = flattenRecursive(shape.children, layerCount)
            } else {
                let t = shape.relativeTransform;
                console.log('shape.type', shape.type);

                /// check for transforms
                if (t[0][0].toFixed(6) != 1 || 
                    t[0][1].toFixed(6) != 0 || 
                    t[1][0].toFixed(6) != 0 || 
                    t[1][1].toFixed(6) != 1 ||
                    false) {                    
                    figma.flatten( [shape] )
                    layerCount ++
                } else if (shape.type == 'TEXT') {
                    figma.flatten([shape])
                    layerCount++
                }
            }
        });
        return layerCount
    } catch (error) {
        console.log(error);
        
        return layerCount
    }
}

function rasterizeSelection(selection, layerCount) {
    try {
        let newSelection = []

        selection.forEach(shape => {
            if (shape.type == 'GROUP') {
                let imgScale = Math.min(4000 / Math.max(shape.width, shape.height), 6)  // limit it to 4000px
                // alert(imgScale)       
                let options = {
                    format: "PNG",
                    constraint: { type: "SCALE", value: imgScale }
                }
                let shapeTransform = shape.relativeTransform        // store transform
                let removeTransform = [[1, 0, shape.x], [0, 1, shape.y]]
                shape.relativeTransform = removeTransform

                shape.exportAsync(options)
                .then(img => {
                    // console.log(figma.createImage(img));
                    let rect = figma.createRectangle()
                    
                    shape.parent.appendChild(rect)
                    rect.x = shape.x
                    rect.y = shape.y
                    rect.relativeTransform = shapeTransform
                    rect.name = shape.name + '_rasterize'
                    rect.resize( shape.width, shape.height)

                    let fillObj = JSON.parse(JSON.stringify(rect.fills[0]))
                    
                    fillObj.filters = {
                        contrast: 0,
                        exposure: 0,
                        highlights: 0,
                        saturation: 0,
                        shadows: 0,
                        temperature: 0,
                        tint: 0,
                    }
                    fillObj.imageHash = figma.createImage(img).hash
                    fillObj.imageTransform = [[1, 0, 0], [0, 1, 0]]
                    fillObj.scaleMode = "CROP"
                    fillObj.type = "IMAGE"
                    fillObj.scalingFactor = 0.5,
                    delete fillObj.color
                    
                    rect.fills = [fillObj]
                    newSelection.push(rect)

                    shape.relativeTransform = shapeTransform
                })
                layerCount++
            }
        });
        
        setTimeout(() => { figma.currentPage.selection = newSelection }, 50)

        return layerCount
    } catch (error) {
        console.log(error);
        return layerCount
    }
}
async function generateFrameImage() {
    try {
        let firstSelected = figma.currentPage.selection[0]
        let parentFrame = findFrame(figma.currentPage.selection[0])
        
        let options = {
            format: "PNG",
            constraint: { type: "SCALE", value: 6 }
        }
        parentFrame.exportAsync(options)
        .then(img => {
            // console.log('hsadjfhjkahsdf', img);
            
            return figma.createImage(img)
        })
    } catch (error) {
        console.log(error);
        return null
    }
}
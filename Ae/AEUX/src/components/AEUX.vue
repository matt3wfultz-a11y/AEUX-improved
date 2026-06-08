<template>
    <Wrapper v-if="prefsLoaded">
        <Dropzone
            :accepts="[ '.json' ]"
            auto-read auto-parse @read="buildLayers"
        />

        <div class="tab-bar">
            <div class="tab" :class="{ active: activeTab === 'layers' }" @click="activeTab = 'layers'">Layers</div>
            <div class="tab" :class="{ active: activeTab === 'colors' }" @click="activeTab = 'colors'">
                Colors
                <span v-if="colorPalette.length" class="tab-badge">{{ colorPalette.length }}</span>
            </div>
        </div>

        <div v-show="activeTab === 'layers'">
        <Row margin="0 auto 8px auto" style="width: 168px">
            <Button-Group
                :active="(prefs.newComp) ? 0 : 1"
                exclusive
                @update="val => setPref('newComp', val == 0)">
                <Button
                    prefix-icon="plus"
                    label="New Comp"
                    tooltip="Add layers to new comp"
                    tall
                    margin="0px" />
                <Button
                    prefix-icon="arrow-down"
                    label="Current"
                    tooltip="Add layers to open comp"
                    tall
                    margin="0px" />
            </Button-Group>
        </Row>

        <Fold
			label="Options"
			:open="true"
            prefs-id="foldOptions">
            <div class="path-label">Image save path:</div>
            <Folder-Picker
                :style="{ 'margin-left':'-4px !important', 'margin-bottom': '6px' }"
                folder
                prefs-id="folderPath"
                @prefs-update="updatePrefs"
                ref="folder"
                label="Filepath"
                :prefs="prefs"
                full-path
                clearable
                no-label
            />
            <!-- <Folder-Picker
                :style="{ 'margin-left':'20px !important', }"
                folder
                prefs-id="folderPath"
                @prefs-update="updatePrefs"
                @input="testRead"
                ref="folder"
                label="Filepath"
                :prefs="prefs"
                :is-relative="prefs.relativeExport"
                full-path
                clearable
                no-label
            /> -->
            <Select
                v-show="prefs.newComp"
                :items="compScaleOptions"
                :active="prefs.compScale - 1"
                label="Comp size multiplier"
                label-to-right
                @update="val => setPref('compScale', parseInt(compScaleOptions[val].value) + 1)"
                no-indicator
            />
            <Input-Scroll 
                v-show="prefs.newComp"
                label='Frame rate:' 
                lazy
                suffix="fps" 
                :size="10"
                @change="val => setPref('frameRate', val)"
                :value="prefs.frameRate"
                :reset-value="prefs.frameRate"
                :min="1" 
                :max="99" />
            <Input-Scroll 
                v-show="prefs.newComp"
                label='Comp duration:' 
                lazy
                suffix="seconds" 
                :size="10"
                @change="val => setPref('duration', val)"
                :value="prefs.duration"
                :reset-value="prefs.duration"
                :min="1" 
                :max="1000" />
			<Toggle
				label="Detect parametric shapes"
				:state="prefs.parametrics"
				@update="val => setPref('parametrics', val)"
			/>
			<Toggle
				label="Precomp groups"
				:state="prefs.precompGroups"
				@update="val => setPref('precompGroups', val)"
			/>
		</Fold>

        <Fold label="Groups"
            :open="false"
            prefs-id="foldGroups">
			<Button-Group grid column>
				<Button
					left
					tall
					icon-size="16px"
					prefix-icon="image-filter-center-focus-weak"
                    tooltip="Group selected layers"
					label="Precomp"
                    @click="aeCall('groupToPrecomp')"
				/>
				<Button
					left
					tall
					icon-size="16px"
					prefix-icon="arrow-expand-all"
                    tooltip="Expand layers from selected precomps"
					label="Un-Precomp"
                    @click="aeCall('precompToLayers')"
				/>
				<Button
					left
					tall
					icon-size="16px"
					prefix-icon="eye-off"
                    tooltip="Show/hide all guide layers"
					label="Toggle guide layer visibility"
                    @click="aeCall('toggleGroupVisibility')"
				/>
				<Button
					left
					tall
					icon-size="16px"
					prefix-icon="delete"
                    tooltip="Remove all AEUX created guide layers"
					label="Delete group layers"
                    @click="aeCall('deleteGroupLayers')"
				/>
			</Button-Group>
		</Fold>

        <Fold label="System"
            :open="false"
            prefs-id="foldSystem">
            <Button
                block
                goto="https://aeux.io"
                tooltip="aeux.io"
                @click.alt.native="openConfig">
                Learn stuff
            </Button>
            <Panel-Info name uppercase version>
                <i>Brought to you by your friends at Google motion design</i>
            </Panel-Info>
        </Fold>
        </div><!-- end layers tab -->

        <div v-show="activeTab === 'colors'" class="colors-tab">
            <div v-if="colorPalette.length" class="swatch-grid">
                <div
                    v-for="(swatch, i) in colorPalette"
                    :key="i"
                    class="swatch"
                    :style="{ background: swatchCss(swatch.color) }"
                    :title="swatchHex(swatch.color)"
                    @click="applyColor(swatch)"
                />
            </div>
            <div v-if="colorPalette.length" class="swatch-hint">Click a swatch to apply color to selected layer</div>
            <div v-else class="swatch-empty">No palette loaded yet.<br>Export from Figma to populate.</div>
        </div>

        <Footer :footerMessage.sync="footerMessage" />
    </Wrapper>
</template>

<script>
/*jshint esversion: 6, asi: true*/


// import { log } from "util";
import fs from 'fs'
import amulets from 'amulets'

amulets.configure({
    devName: 'sumUX',
    scriptName: 'AEUX'
})

export default {
    components: {
        "Folder-Picker": require("@/components/custom/File-Picker").default,
    },
	data: () => ({
        aeuxVersion: 0.7,
        activeTab: 'layers',
        colorPalette: [],
		prefs: {
			newComp: true,
			precompGroups: false,
			parametrics: true,
			compScale: 1,
			frameRate: 60,
			duration: 5,
            absolutePath: null,
        },
        prefsLoaded: false,
		compScaleOptions: [
			{label: '1x', value: '0'},
			{label: '2x', value: '1'},
			{label: '3x', value: '2'},
			{label: '4x', value: '3'},
			{label: '5x', value: '4'},
            {label: '6x', value: '5'},
		],
        footerMessage: null,
	}),
	methods: {
        aeCall (msg, data) {
            amulets.evalScript(msg, data)
        },
        buildLayers (layerData) {
            if (layerData && layerData[0] && layerData[0].colorPalette && layerData[0].colorPalette.length) {
                this.colorPalette = layerData[0].colorPalette
                this.activeTab = 'colors'
            }
            amulets.evalScript('buildLayers', {layerData})
        },
        swatchCss(color) {
            const r = Math.round(color[0] * 255)
            const g = Math.round(color[1] * 255)
            const b = Math.round(color[2] * 255)
            return `rgb(${r},${g},${b})`
        },
        swatchHex(color) {
            const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0')
            return '#' + toHex(color[0]) + toHex(color[1]) + toHex(color[2])
        },
        applyColor(swatch) {
            amulets.evalScript('applySwatchColor', { color: swatch.color })
        },
        receivePalette(palette) {
            if (palette && palette.length) {
                this.colorPalette = palette
            }
        },
        updatePrefs(val) {
            console.log(val);
            Object.keys(val).forEach(prefName => {
                this.prefs[prefName] = val[prefName]
            })
            amulets.savePrefs(this.prefs)
        },
        openConfig () {
            amulets.openUserFolder('config')
        },
        //// set pref and save to prefs file
        setPref (pref, value) {
            this.prefs[pref] = value
            console.log(pref, this.prefs[pref]);
            amulets.savePrefs(this.prefs)
            // this.savePrefs()      
        },
        parseFooterMessages(msg) {
            /// reset var
            var messagesToPost = [];

            /// available messages
            var messages = [
                null,
                'Unsupported:\nText gradient fills',
                'Unsupported:\nAngular gradients',
                'Unsupported:\nComp width exceeds 30,000px',
                'Unsupported:\nComp height exceeds 30,000px',
                'Error:\nCan\'t save preset file',
                'Error:\nCan\'t locate image file',
                'Error:\nFigma image downloads CC2018+',
            ]

            /// filter out duplicate messages
            var uniqueMessages = msg.filter( onlyUnique );

            /// add all messages into an array
            for (var i = 0; i < uniqueMessages.length; i++) {
                // if (i == 0) {
                    // messagesToPost.push('Unsupported:')
                // }
                messagesToPost.push(messages[ uniqueMessages[i] ])
            }

            /// create one string from all the messages
            return messagesToPost.join('\n');

            function onlyUnique(value, index, self) {
                return self.indexOf(value) === index;
            }
        },
		//// open dialog for reading a file from disk
		// openFile: function () {
		// 	var path = window.cep.fs.showOpenDialog();  
		// 	console.log(path);
			          
        //     // vm.buildLayersFromFile(path);

		// },
		openBetaDoc () {
            amulets.webLink('https://docs.google.com/document/d/1weEWK3uJbsnHHO5rlSq95hVi9rGlPd9q1t2bf1glbQk/edit?usp=sharing')
        }
	},
	computed: {
		// Use as this.app
		// app() {
		// 	return this.$root.$children[0];
		// },
		// Use as this.cs
		// cs() {
		// 	return this.app.csInterface;
        // },
        // userPath() {
        //     return this.cs.getSystemPath(SystemPath.USER_DATA) + '/sumUX/AEUX/'
        // },
        // spy() {
        //     return require("cep-spy").default;
        // },
	},
	mounted() {
        amulets.getPrefs(this.prefs)
        .then(prefs => {
            console.log(prefs);
            this.prefs = prefs
            this.prefsLoaded = true
        })
        setInterval(() => {
            amulets.evalScript('getPendingPalette')
            .then(result => {
                if (result && result !== 'null') {
                    try {
                        const palette = JSON.parse(result)
                        if (Array.isArray(palette) && palette.length) {
                            this.colorPalette = palette
                            this.activeTab = 'colors'
                        }
                    } catch (e) {}
                }
            })
        }, 1000)
	}
}

</script>

<style>
.brutalism-position-offset {
    flex-direction: row-reverse;
}
.select-label {
    margin-left: 4px;
}
.select-menu-item {
    padding: 3px 6px 3px 0 !important;
}
.select-menu-item-label {
    padding-left: 8px;
}
.tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border, #444);
    margin-bottom: 4px;
}
.tab {
    flex: 1;
    text-align: center;
    padding: 6px 0;
    font-size: 11px;
    cursor: pointer;
    color: var(--color-icon);
    position: relative;
}
.tab.active {
    color: var(--color-default);
    border-bottom: 2px solid var(--color-selection, #4d90fe);
    margin-bottom: -1px;
}
.tab-badge {
    background: var(--color-selection, #4d90fe);
    color: #fff;
    border-radius: 8px;
    font-size: 9px;
    padding: 1px 4px;
    margin-left: 3px;
    vertical-align: middle;
}
.colors-tab {
    padding: 8px 4px;
}
.swatch-empty {
    color: var(--color-icon);
    font-size: 11px;
    text-align: center;
    padding: 24px 8px;
    line-height: 1.6;
}
.swatch-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 0 6px 0;
}
.swatch {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid rgba(255,255,255,0.1);
    flex-shrink: 0;
}
.swatch:hover {
    transform: scale(1.2);
    border-color: rgba(255,255,255,0.4);
}
.swatch-hint {
    font-size: 10px;
    color: var(--color-icon);
    margin-bottom: 4px;
}
.path-label {
    color: var(--color-icon);
    margin-bottom: -6px;
}
.input-value {
    font-size: 10px;
}
</style>

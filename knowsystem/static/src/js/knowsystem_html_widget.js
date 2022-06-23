/** @odoo-module **/

import fieldRegistry from "web.field_registry";
import rpc from "web.rpc";
import FieldHtml from "web_editor.field.html";

rpc.query({
    model: "knowsystem.article",
    method: "get_backend_editor_widget",
    args: [],
}).then(function(res) {
    if (res) {

        import basicFields from "web.basic_fields";

        var KnowSystemFieldHtml = basicFields.AceEditor.extend({
            init: function () {
                this._super.apply(this, arguments);  
                if (!this.record.data.id && this.mode === 'edit' && this.record.context && this.record.context.default_knowdescription) {
                    this.value = this.record.context.default_knowdescription;
                    this.record.context.default_knowdescription = false;
                }
                else {
                    this.record.context.default_knowdescription = false;
                    this.value = this.recordData[this.nodeOptions['inline-field']];
                };
            },          
            _setValue: function (value, options) {
                var self = this;
                return this._super.apply(this, arguments).then(function () {
                    var fieldName = self.nodeOptions['inline-field'];
                    self.trigger_up('field_changed', {
                        dataPointID: self.dataPointID,
                        changes: _.object([fieldName], [self.value])
                    });                        
                })
            },
        });
    }
    else {
        /** implemented based on Odoo mass_mailing **/

        import convertInline from "web_editor.convertInline";
        import knowConvertInline from "@knowsystem/js/convert_inline";
        import config from "web.config";

        /*
        * copied from web/convert_inline.js
        */
        function _isHidden(element) {
            return element.offsetParent === null;
        };
        function _getStylePropertyValue(element, propertyName) {
            const computedStyle = lastComputedStyleElement === element ? lastComputedStyle : getComputedStyle(element)
            lastComputedStyleElement = element;
            lastComputedStyle = computedStyle;
            return computedStyle[propertyName] || element.style.getPropertyValue(propertyName);
        };
        function _getWidth(element) {
            return parseFloat(getComputedStyle(element).width.replace('px', ''));
        }
        function _getHeight(element) {
            return parseFloat(getComputedStyle(element).height.replace('px', ''));
        }
        /*
        * copied from web/convert_inline.js
        */

        var KnowSystemFieldHtml = FieldHtml.extend({
            jsLibs: [
                "/knowsystem/static/src/js/knowsystem_snippets.js",
            ],
            custom_events: _.extend({}, FieldHtml.prototype.custom_events, { 
                snippets_loaded: '_onSnippetsLoaded',
                getRecordInfo: '_onGetRecordInfo',
            }),
            isQuickEditable: false,
            /*
             * Re-write to apply our especially prepared snippets
            */
            init: function () {
                this._super.apply(this, arguments);
                if (!this.nodeOptions.snippets) {this.nodeOptions.snippets = 'knowsystem.knowsystem_snippets'};
            },
            /*
             * Re-write to save changes into 'readonly' html field
            */
            commitChanges: async function () {
                var self = this;
                if (this.mode === "readonly" || !this.isRendered) {
                    return this._super();
                };
                /** temp fix for 2 cases:
                  ** when snippet is dnd, but saved as table to the field arch
                  ** when default value is applied (from template) but not saved without a change to an article
                  ** To-do: seems to be fixed!
                */ 
                this.trigger_up("field_changed", {
                    dataPointID: self.dataPointID,
                    changes: _.object(["description_arch"], [this.value])
                });
                /* End */ 

                /** temp fix for not saved source code for readonly field */
                if (this._$codeview && !this._$codeview.hasClass('d-none')) {
                    this.wysiwyg.setValue(this._$codeview.val());
                }
                /* End */    

                var fieldName = this.nodeOptions["inline-field"];
                var $editable = this.wysiwyg.getEditable();
                if (this.wysiwyg.snippetsMenu) {
                    await this.wysiwyg.snippetsMenu.cleanForSave();
                }
                return this.wysiwyg.saveModifiedImages(this.$content).then(function () {
                    self._isDirty = self.wysiwyg.isDirty();
                    self._doAction();                    
                    
                    const editable = $editable.get(0);
                    const iframe = self.wysiwyg.$iframe && self.wysiwyg.$iframe.get(0);
                    const doc = editable.ownerDocument;

                    var cssRules = self.cssRules || doc._rulesCache;                   
                    if (!cssRules) {
                         cssRules = convertInline.getCSSRules(doc);
                         doc._rulesCache = cssRules;
                    };

                    const displaysToRestore = [];
                    if (_isHidden(editable)) {
                        let ancestor = editable;
                        while (ancestor && ancestor.nodeName !== 'html' && _isHidden(ancestor)) {
                            if (_getStylePropertyValue(ancestor, 'display') === 'none') {
                                displaysToRestore.push([ancestor, ancestor.style.display]);
                                ancestor.style.setProperty('display', 'block');
                            }
                            ancestor = ancestor.parentElement;
                            if ((!ancestor || ancestor.nodeName === 'HTML') && iframe) {
                                ancestor = iframe;
                            }
                        }
                    }

                    for (const attributeName of ['width', 'height']) {
                        const images = editable.querySelectorAll('img');
                        for (const image of images) {
                            let value = image.getAttribute(attributeName) || (attributeName === 'height' && image.offsetHeight);
                            if (!value) {
                                value = attributeName === 'width' ? _getWidth(image) : _getHeight(image);;
                            }
                            image.setAttribute(attributeName, value);
                            image.style.setProperty(attributeName, image.getAttribute(attributeName));
                        };
                    };

                    convertInline.attachmentThumbnailToLinkImg($editable);
                    convertInline.fontToImg($editable);
                    convertInline.classToStyle($editable, cssRules);
                    convertInline.bootstrapToTable($editable);
                    convertInline.cardToTable($editable);
                    convertInline.listGroupToTable($editable);
                    knowConvertInline.knowAddTables($editable);
                    knowConvertInline.knowFormatTables($editable);
                    convertInline.normalizeColors($editable);
                    const rootFontSizeProperty = getComputedStyle(editable.ownerDocument.documentElement).fontSize;
                    const rootFontSize = parseFloat(rootFontSizeProperty.replace(/[^\d\.]/g, ''));
                    convertInline.normalizeRem($editable, rootFontSize);

                    self.trigger_up("field_changed", {
                        dataPointID: self.dataPointID,
                        changes: _.object([fieldName], [self._unWrap($editable.html())])
                    });

                    $editable.html(self.value);
                    if (self._isDirty && self.mode === "edit") {
                        return self._doAction();
                    };
                });
            },
            /*
             *  Re-write to remove value from url (as iframe)
            */
            getDatarecord: function () {
                return _.omit(this._super(), [
                    'description', 
                    'description_arch', 
                    'indexed_description', 
                    'kanban_description', 
                    'kanban_manual_description', 
                    'attachment_ids'
                ]);
            },
            /*
             *  Re-write to assign our name
            */
            _createWysiwygIntance: async function () {
                await this._super(...arguments);
                this.$content.find(".o_layout").addBack().data("name", "KnowSystem");
            },
            /*
             * Re-write to take content from 'readonly' field. In case we get context, we also take it from there
             * Improtant we do not take value from inline-field to make snippets correctly work (not to work with
               re-processed table snippets)
            */
            _renderEdit: function () {
                if (!this.record.data.id && this.record.context && this.record.context.default_knowdescription) {
                    this.value = this.record.context.default_knowdescription;
                }
                else if (!this.value) {
                    this.value = this.recordData[this.nodeOptions['inline-field']];
                };
                return this._super.apply(this, arguments);
            },
            /*
             *  Re-write to not add translation button
            */
            _renderTranslateButton: function () {return $();},               
            /*
             *  Re-write to redefine editor options
            */
            _getWysiwygOptions: function () {
                const options = this._super.apply(this, arguments);
                options.resizable = false;
                options.defaultDataForLinkTools = { isNewWindow: true };
                options.know_snippets = true;
                return options;
            },
            /*
             *  Re-write to update iframe 
            */
            _onLoadWysiwyg: function () {
                if (this.snippetsLoaded) {
                    this._onSnippetsLoaded(this.snippetsLoaded);
                }
                this._super();
                this.wysiwyg.odooEditor.observerFlush();
                this.wysiwyg.odooEditor.historyReset();
                this.wysiwyg.$iframeBody.addClass("knowsystem_iframe");
                this.trigger_up("iframe_updated", { $iframe: this.wysiwyg.$iframe });
            },
            /**
             * @private
             * @param {OdooEvent} ev
             * The method to define sidebar styles and actions (including full and code view)
            */
            _onSnippetsLoaded: function (ev) {
                var self = this;
                if (this.wysiwyg.snippetsMenu && $(window.top.document).find(".o_knowsystem_form")[0]) {
                    this.wysiwyg.snippetsMenu.$scrollable = this.$el.closestScrollable();
                    this.wysiwyg.snippetsMenu.$scrollable.css("overflow-y", "scroll");
                };
                if (!this.$content) {
                    this.snippetsLoaded = ev;
                    return;
                }
                var $snippetsSideBar = ev.data;
                var $snippets = $snippetsSideBar.find(".oe_snippet");
                var selectorToKeep = ".o_we_external_history_buttons, .knowsystem_top_actions";
                $snippetsSideBar.find(`.o_we_website_top_actions>*:not(${selectorToKeep})`).attr('style', 'display: none!important');

                $snippetsSideBar.find(".fa-repeat").hide();

                var $snippets_menu = $snippetsSideBar.find("#snippets_menu");
                if (config.device.isMobile) {
                    $snippetsSideBar.hide();
                    this.$content.attr("style", "padding-left: 0px !important");
                };

                this._$codeview = this.wysiwyg.$iframe.contents().find('textarea.o_codeview'); // always shown
                $snippetsSideBar.on('click', '.o_codeview_btn', () => this._toggleCodeView(this._$codeview)); 

            },
            /**
             * @private
             * Re-write to apply own action for code view
             */
            _toggleCodeView: function ($codeview) {
                this._super(...arguments);
                const isFullWidth = !!$(window.top.document).find(".o_knowsystem_form")[0];
                $codeview.css("height", isFullWidth ? $(window).height() : '');
                if ($codeview.hasClass("d-none")) {
                    this.trigger_up("iframe_updated", { $iframe: this.wysiwyg.$iframe });
                }
            },
            /**
             * Re-write to avoid translation
             */
            _onTranslate: function (ev) {
            },
            /**
             * The method to save model data 
             */
            _onGetRecordInfo: function (event_data) {
                var recordInfo = event_data.data.recordInfo || {};
                recordInfo.context = this.record.getContext(this.recordParams);
                recordInfo.res_model = this.model;
                recordInfo.res_id = this.res_id;
                event_data.data.callback(recordInfo);
            },

        });        
    };

    fieldRegistry.add('knowsystem_html_editor', KnowSystemFieldHtml);
    export default KnowSystemFieldHtml;

});


var NotEditableFieldHtml = FieldHtml.extend({
    isQuickEditable: false,
});

fieldRegistry.add('not_editable_html', NotEditableFieldHtml);
export default NotEditableFieldHtml;

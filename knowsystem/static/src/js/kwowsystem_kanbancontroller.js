/** @odoo-module **/

import KanbanController from "web.KanbanController"; 
import DataExport from "web.DataExport";
import dialogs from "web.view_dialogs";
import { qweb, _lt } from "web.core";

const KnowSystemKanbanController = KanbanController.extend({
    events: _.extend({}, KanbanController.prototype.events, {
        "change #knowsort": "_applyKnowSorting",
        "click .knowreverse_sort": "_applyReverseKnowSorting",
        "click .knowselect_all": "addAll2SelectedArticles",
        "click #add_know_section": "_addRootSection",
        "click #add_know_tag": "_addRootTag",
        "click #add_know_type": "_addRootType",
        "click .clear_sections": "_clearSections",
        "click .clear_tags": "_clearTags",
        "click .clear_types": "_clearTypes",
        "click .clear_selected_articles": "_clearAllSelectedArticles",
        "click .knowsystem_article_selected_row": "_removeArticleSelected",
        "click .selected_articles_update": "_massUpdateSelectedArticles",
        "click .selected_articles_pdf": "_onKnowSystemPrint",
        "click .selected_articles_export": "_onKnowSystemExport",
        "click .selected_articles_add_to_tour": "_onAddToTour",
        "click .selected_articles_favourite": "_addSelectedArticles2Favourite",
        "click .selected_articles_follow": "_followSelectedArticles",
        "click .selected_articles_unfollow": "_unFollowSelectedArticles",
        "click .selected_articles_archive": "_archiveSelectedArticles",
        "click .selected_articles_publish": "_archiveSelectedPublish",
        "click .selected_articles_duplicate": "_copySelectedArticles",
        "click #add_new_tour": "_addNewTour",
        "click .play_tour": "_onTourClick",
        "contextmenu .play_tour": "_onTourRightClick",
        "click #knowsystem_section_search_btn": "_onSearchSection",
        "click #knowsystem_section_search_clear": "_onClearSearchSection",
        "keyup #knowsystem_section_search": "_onKeyUpSectionSearch",
        "click #knowsystem_tag_search_btn": "_onSearchTag",
        "click #knowsystem_tag_search_clear": "_onClearSearchTag",
        "keyup #knowsystem_tag_search": "_onKeyUpTagSearch",
    }),
    jsLibs: ['/knowsystem/static/lib/jstree/jstree.js'],
    cssLibs: ['/knowsystem/static/lib/jstree/themes/default/style.css'],
    custom_events: _.extend({}, KanbanController.prototype.custom_events, {select_record: '_articleSelected',}),
    /**
     * Re-write to keep params for further usage
    */
    init: function () {
        this._super.apply(this, arguments);
        this.nonavigation_update = false;
        this.selectedRecords = [];
        this.navigationExist = false;
    },
    /**
     * Re-write to add kanban classes
    */
    start: function () {
        this.$('.o_content').addClass('knowsystem_articles d-flex');
        return this._super.apply(this, arguments);
    },
    /**
     * Re-write to render navigation
    */
    _update: function () {
        var self = this;
        var def = $.Deferred();
        this._super.apply(this, arguments).then(function (res) {
            var state = self.model.get(self.handle);
            if (self.navigationExist) {def.resolve(res);}
            else {
                self._renderNavigationPanel().then(function () {def.resolve(res);});
            };
            self.renderer.updateSelection(self.selectedRecords);
        });
        return def
    },
    /**
     * Re-write to avoid rerendering left navigation panel
    */ 
    update: function (params, options) {
        var domain = params.domain || []
        this.nonavigation_update = true;
        params.knowSystemDomain = this._renderArticles();
        return this._super(params, options);
    },
    /**
     * Re-write to add custom buttons
    */  
    renderButtons: function ($node) {
        var self = this;
        $.when(this._super.apply(this, arguments)).then(function () {
            if (self.is_action_enabled('create') && self.modelName == 'knowsystem.article') {
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_create_from_template',
                    self._onKnowSystemCreateFromTemplate.bind(self)
                );
            };
        });
    },
    /**
     * Re-write to force reload
    */  
    _reloadAfterButtonClick: function (kanbanRecord, params) {
        var self = this;
        $.when(this._super.apply(this, arguments)).then(function () {self.reload();});
    },
    /**
     * @private
     * @param {MouseEvent} event
     * @param {passed} - options dict with a possible bool param 'passed' 
                        (neded for reverse sorting - _applyReverseKnowSorting)
     * The method to order articles by a chosen criteria
    */
    _applyKnowSorting: function(event, passed) {
        event.stopPropagation();
        var self = this,
            sortKey = event.currentTarget.value,
            data = this.model.get(this.handle),
            list = this.model.localData[data.id],
            asc = true;
        if (passed && passed.reverse) {
            if (list.orderedBy.length != 0 && list.orderedBy[0].name == sortKey) {asc = list.orderedBy[0].asc;}
            else {asc = false;};
        };
        list.orderedBy = [];
        list.orderedBy.push({name: sortKey, asc: asc}); // To hack default 'desc' instead of 'asc'
        this.model.setSort(data.id, sortKey).then(function () {self.reload({});});
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to order articles by a chosen criteria
    */
    _applyReverseKnowSorting: function(event) {
        event.stopPropagation();
        this.$("#knowsort").trigger("change", {"reverse": true});
    },
    /**
     * @private
     * The method to retrieve sections for a current user
    */ 
    _renderSections: function () {
        var self = this,
            defer = $.Deferred();
        self.$('#sections').jstree('destroy');
        self._rpc({
            model: "knowsystem.section",
            method: 'return_nodes',
            args: [],
        }).then(function (availableSections) {
            var jsTreeOptions = {
                'core' : {
                    'themes': {'icons': false},
                    'check_callback' : true,
                    'data': availableSections,
                    "multiple" : true,
                    "strings": {"New node": _lt('New Section'),}
                },
                "plugins" : [
                    "contextmenu",
                    "checkbox",
                    "state",
                    "search",
                ],
                "state" : { "key" : "sections" },
                "checkbox" : {
                    "three_state" : false,
                    "cascade": "down",
                    "tie_selection" : false,
                },
                "search": {
                    "case_sensitive": false,
                    "show_only_matches": true,
                    "fuzzy": false,
                    "show_only_matches_children": true,
                },
                "contextmenu": {
                    "select_node": false,
                    "items": function($node) {
                        var tree = $("#sections").jstree(true);
                        return {
                            "Print": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Print"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._printBatch(resId, false);
                                }
                            },
                        }
                    },
                },
            }
            if (self.is_action_enabled("create")) {
                jsTreeOptions.plugins = [
                    "checkbox",
                    "contextmenu",
                    "dnd",
                    "state",
                    "search",
                ];
                jsTreeOptions.contextmenu = {
                    "select_node": false,
                    "items": function($node) {
                        var tree = $("#sections").jstree(true);
                        return {
                            "Create": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Create"),
                                "action": function (obj) {
                                    $node = tree.create_node($node);
                                    tree.edit($node);
                                }
                            },
                            "Rename": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Rename"),
                                "action": function (obj) {
                                    tree.edit($node);
                                }
                            },
                            "Edit": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Edit"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._onEditSectionForm(resId);
                                }
                            },
                            "Print": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Print"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._printBatch(resId, false);
                                }
                            },
                            "Remove": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Archive"),
                                "action": function (obj) {
                                    tree.delete_node($node);
                                }
                            },
                        };
                    },
                };
            };
            var ref = self.$('#sections').jstree(jsTreeOptions);
            if (self.is_action_enabled("create")) {
                self.$('#sections').on("rename_node.jstree", self, function (event, data) {
                    // This also includes 'create' event. Since each time created, a node is updated then
                    self._updateNode(event, data, 'knowsystem.section', false);
                });
                self.$('#sections').on("move_node.jstree", self, function (event, data) {
                    self._updateNode(event, data, 'knowsystem.section', true);
                });
                self.$('#sections').on("delete_node.jstree", self, function (event, data) {
                    self._deleteNode(event, data, 'knowsystem.section');
                });
                self.$('#sections').on("copy_node.jstree", self, function (event, data) {
                    self._updateNode(event, data, 'knowsystem.section', true);
                });
            };
            self.$('#sections').on("state_ready.jstree", self, function (event, data) {
                // We register 'checks' only after restoring the tree to avoid multiple checked events
                self.$('#sections').on("check_node.jstree uncheck_node.jstree", self, function (event, data) {
                    self.reload();
                })
            });
            defer.resolve();
        });
        return defer;
    },
    /**
     * @private
     * The method to show article tags section (for a current user)
    */ 
    _renderTags: function () {
        var self = this,
            defer = $.Deferred();
        self.$('#tags').jstree('destroy');
        self._rpc({
            model: "knowsystem.tag",
            method: 'return_nodes',
            args: [],
        }).then(function (availableTags) {
            var jsTreeOptions = {
                'core' : {
                    'themes': {'icons': false},
                    "multiple" : true,
                    'check_callback' : true,
                    'data': availableTags,
                    "strings": {"New node": _lt('New Tag'),}
                },
                "plugins" : [
                    "contextmenu",
                    "checkbox",
                    "state",
                    "search",
                ],
                "state" : { "key" : "tags" },
                "checkbox" : {
                    "three_state" : false,
                    "cascade": "down",
                    "tie_selection" : false,
                },
                "contextmenu": {
                    "select_node": false,
                    "items": function($node) {
                        var tree = $("#tags").jstree(true);
                        return {
                            "Print": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Print"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._printBatch(false, resId);
                                }
                            },
                        }
                    },
                },
                "search": {
                    "case_sensitive": false,
                    "show_only_matches": true,
                    "fuzzy": false,
                    "show_only_matches_children": true,
                },
            };
            if (self.is_action_enabled("create")) {
                jsTreeOptions.plugins = [
                    "checkbox",
                    "contextmenu",
                    "dnd",
                    "state",
                    "search",
                ];
                jsTreeOptions.contextmenu = {
                    "select_node": false,
                    "items": function($node) {
                        var tree = $("#tags").jstree(true);
                        return {
                            "Create": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Create"),
                                "action": function (obj) {
                                    $node = tree.create_node($node);
                                    tree.edit($node);
                                }
                            },
                            "Rename": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Rename"),
                                "action": function (obj) {
                                    tree.edit($node);
                                }
                            },
                            "Edit": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Edit"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._onEditTagForm(resId);
                                }
                            },
                            "Print": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Print"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._printBatch(false, resId);
                                }
                            },
                            "Remove": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Archive"),
                                "action": function (obj) {
                                    tree.delete_node($node);
                                }
                            },
                        };
                    },
                };
            };
            var ref = self.$('#tags').jstree(jsTreeOptions);
            if (self.is_action_enabled("create")) {
                self.$('#tags').on("rename_node.jstree", self, function (event, data) {
                    // This also includes 'create' event. Since each time created, a node is updated then
                    self._updateNode(event, data, 'knowsystem.tag', false);
                });
                self.$('#tags').on("move_node.jstree", self, function (event, data) {
                    self._updateNode(event, data, 'knowsystem.tag', true);
                });
                self.$('#tags').on("delete_node.jstree", self, function (event, data) {
                    self._deleteNode(event, data, 'knowsystem.tag');
                });
                self.$('#tags').on("copy_node.jstree", self, function (event, data) {
                    self._updateNode(event, data, 'knowsystem.tag', true);
                });
            };
            self.$('#tags').on("state_ready.jstree", self, function (event, data) {
                self.reload({"domain": self.model.get(self.handle).domain});
                // We register 'checks' only after restoring the tree to avoid multiple checked events
                self.$('#tags').on("check_node.jstree uncheck_node.jstree", self, function (event, data) {
                    self.reload();
                });
            });
            defer.resolve();
        });
        return defer;
    },
    /**
     * @private
     * The method to show article types section (for a current user)
    */  
    _renderTypes: function () {
        var self = this,
            defer = $.Deferred();
        self.$('#know_types').jstree('destroy');
        self._rpc({
            model: "knowsystem.article",
            method: 'action_return_types',
            args: [],
        }).then(function (availableTypes) {
            var jsTreeOptions = {
                'core' : {
                    'themes': {'icons': false},
                    "multiple" : true,
                    'check_callback' : true,
                    'data': availableTypes,
                },
                "plugins" : [
                    "contextmenu",
                    "checkbox",
                    "state",
                    "search",
                ],
                "state" : { "key" : "know_types" },
                "checkbox" : {
                    "three_state" : false,
                    "cascade": "down",
                    "tie_selection" : false,
                },
                "contextmenu": {
                    "select_node": false,
                    "items": function($node) {
                        var tree = $("#know_types").jstree(true);
                        return {}
                    },
                },
            };
            if (self.is_action_enabled("delete")) {
                jsTreeOptions.plugins = [
                    "checkbox",
                    "contextmenu",
                    "dnd",
                    "state",
                    "search",
                ];
                jsTreeOptions.contextmenu = {
                    "select_node": false,
                    "items": function($node) {
                        var tree = $("#know_types").jstree(true);
                        return {
                            "Create": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Create"),
                                "action": function (obj) {
                                    $node = tree.create_node($node);
                                    tree.edit($node);
                                }
                            },
                            "Rename": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Rename"),
                                "action": function (obj) {
                                    tree.edit($node);
                                }
                            },
                            "Edit": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Edit"),
                                "action": function (obj) {
                                    var resId = parseInt($node.id);
                                    self._onEditTypeForm(resId);
                                }
                            },
                            "Remove": {
                                "separator_before": false,
                                "separator_after": false,
                                "label": _lt("Archive"),
                                "action": function (obj) {
                                    tree.delete_node($node);
                                }
                            },
                        };
                    },
                };
            };
            var ref = self.$('#know_types').jstree(jsTreeOptions);
            if (self.is_action_enabled("delete")) {
                self.$('#know_types').on("rename_node.jstree", self, function (event, data) {
                    // This also includes 'create' event. Since each time created, a node is updated then
                    self._updateNode(event, data, 'article.custom.type', false);
                });
                self.$('#know_types').on("move_node.jstree", self, function (event, data) {
                    self._updateNode(event, data, 'article.custom.type', true);
                });
                self.$('#know_types').on("delete_node.jstree", self, function (event, data) {
                    self._deleteNode(event, data, 'article.custom.type');
                });
                self.$('#know_types').on("copy_node.jstree", self, function (event, data) {
                    self._updateNode(event, data, 'article.custom.type', true);
                });
            };
            self.$('#know_types').on("state_ready.jstree", self, function (event, data) {
                // We register 'checks' only after restoring the tree to avoid multiple checked events
                self.$('#know_types').on("check_node.jstree uncheck_node.jstree", self, function (event, data) {
                    self.reload();
                });
            });
            defer.resolve();
        });
        return defer;
    },
    /**
     * @private
     * The method to show tours section
    */  
    async _renderTours() {
        var availableTours = await this._rpc({
            model: "knowsystem.tour",
            method: 'return_tours',
            args: [[]],
        })
        if (!availableTours) {
            var tours = qweb.render('KnowSystemTours', {
                "show_tour": false,
                "tours": [],
                "right_for_delete": this.is_action_enabled('delete'),
            });
        }
        else {
            var tours = qweb.render('KnowSystemTours', {
                "show_tour": true,
                "tours": availableTours,
                "right_for_delete": this.is_action_enabled('delete'),
            });
        };
        this.$('#knowtours')[0].innerHTML = tours;
    },
    /**
     * @private
     * The method to render (left) navigation panel
    */  
    async _renderNavigationPanel() {
        var scrollTop = this.$('.knowsystem_navigation_panel').scrollTop();
        this.$('.knowsystem_navigation_panel').remove();
        var navigationElements = {
            "right_for_create": this.is_action_enabled('create'),
            "right_for_delete": this.is_action_enabled('delete'),
        };
        var $navigationPanel = $(qweb.render('KnowNavigationPanel', navigationElements));
        this.$('.o_content').prepend($navigationPanel);
        this._renderTours();
        await this._renderSections();
        await this._renderTypes();
        await this._renderTags();
        this.$('.knowsystem_navigation_panel').scrollTop(scrollTop || 0);
        this.navigationExist = true;
    },
    /**
     * @private
     * The method o render right navigation panel
    */  
    async _renderRightNavigationPanel() {
        var scrollTop = this.$('.knowsystem_right_navigation_panel').scrollTop();
        this.$('.knowsystem_right_navigation_panel').remove();
        var selectedRecords = this.selectedRecords;
        if (selectedRecords.length) {
            var articles = await this._rpc({
                model: "knowsystem.article",
                method: 'return_selected_articles',
                args: [this.selectedRecords],
            });
            var $navigationPanel = $(qweb.render(
                'KnowRightNavigationPanel', {
                    "articles": articles[0],
                    "count_art": articles[0].length,
                    "right_for_create": this.is_action_enabled('create'),
                    "right_for_delete": this.is_action_enabled('delete'),
                    "knowsystem_website": articles[1],
                })
            );
            this.$('.o_content').append($navigationPanel);
            this.$('.knowsystem_right_navigation_panel').scrollTop(scrollTop || 0);
        };
    },
    /**
     * @private
     * The method to prepare new filters and trigger articles rerender
    */        
    _renderArticles: function () {
        var domain = [],
            refS = this.$('#sections').jstree(true),
            refT = this.$('#tags').jstree(true),
            refTy = this.$('#know_types').jstree(true);
        // sections domain
        if (refS) {
            var checkedSections = refS.get_checked(),
                checkedSectionsIDS = checkedSections.map(function(item) {return parseInt(item, 10)});
            if (checkedSectionsIDS.length != 0) {domain.push(['section_id', 'in', checkedSectionsIDS])};
        };
        // tags domain            
        if (refT) {
            var checkedTags = refT.get_checked(),
                tagsLength = checkedTags.length;
            if (tagsLength != 0) {
                var iterator = 0;
                while (iterator != tagsLength-1) {
                    domain.push('|');
                    iterator ++;
                }
                _.each(checkedTags, function (tag) {
                    if (tag.length) {
                        domain.push(['tag_ids', 'in', parseInt(tag)]);
                    }
                });
            };
        };
        // types domain 
        if (refTy) {
            var checkedTypes = refTy.get_checked(),
                checkedTypesIDS = checkedTypes.map(function(item) {return parseInt(item, 10)});
            if (checkedTypesIDS.length != 0) {domain.push(['custom_type_id', 'in', checkedTypesIDS])};
        };
        return domain
    },
    /**
     * @private
     * The methods to open an edit form of a related node
     * @param {resID} - node ID
    */        
    async _onEditSectionForm(resID) {
        var self = this;
        var view_id = await this._rpc({
            model: "knowsystem.section",
            method: 'return_edit_form',
            args: [[]],
        });
        var onSaved = function(record) {self._renderSections();};
        new dialogs.FormViewDialog(self, {
            res_model: "knowsystem.section",
            title: _lt("Edit Section"),
            view_id: view_id,
            res_id: resID,
            readonly: false,
            shouldSaveLocally: false,
            on_saved: onSaved,
        }).open();
    },
    async _onEditTagForm(resID) {
        var self = this;
        var view_id = await this._rpc({
            model: "knowsystem.tag",
            method: 'return_edit_form',
            args: [[]],
        });
        var onSaved = function(record) {self._renderTags();};
        new dialogs.FormViewDialog(self, {
            res_model: "knowsystem.tag",
            title: _lt("Edit Tag"),
            view_id: view_id,
            res_id: resID,
            readonly: false,
            shouldSaveLocally: false,
            on_saved: onSaved,
        }).open();

    },
    async _onEditTypeForm(resID) {
        var self = this;
        var view_id = await this._rpc({
            model: "knowsystem.article",
            method: 'return_type_edit_form',
            args: [[]],
        })
        if (view_id) {
            var onSaved = function(record) {self._renderTypes();};
            new dialogs.FormViewDialog(self, {
                res_model: "article.custom.type",
                title: _lt("Edit Type"),
                view_id: view_id,
                res_id: resID,
                readonly: false,
                shouldSaveLocally: false,
                on_saved: onSaved,
            }).open();
        };
    },
    /**
     * @private
     * @param {MouseEvent} event
     * @param {data}
     * @param {model} - char - name of a target Odoo model
     * @param {position} - false if rename; int (sequence) otherwise
     * The method to update a node
    */
    async _updateNode(event, data, model, position) {
        if (position) {position = parseInt(data.position);}
        if (data.node.id === parseInt(data.node.id).toString()) {
            await this._rpc({
                model: model,
                method: 'update_node',
                args: [[parseInt(data.node.id)], data.node, position],
            });
        }
        else {
            await this._rpc({
                model: model,
                method: 'create_node',
                args: [data.node],
            });
            if (model == "knowsystem.section") {this._renderSections();};
            if (model == "knowsystem.tag") {this._renderTags();};
            if (model == "article.custom.type") {this._renderTypes();};
        };
    },
    /**
     * @private
     * @param {MouseEvent} event
     * @param {data}
     * @param {model} - char - name of a target Odoo model
     * The method to delete a node
    */
    async _deleteNode(event, data, model) {
        await this._rpc({
            model: model,
            method: 'delete_node',
            args: [[parseInt(data.node.id)]],
        });
    },
    /**
     * @private
     * @param {refID} - - char for js selector - jstree id
     * The method to add new root nodes
    */
    _addTreeRootNode: function(refID) {
        var ref = this.$(refID).jstree(true),
            sel = ref.get_selected();
        sel = ref.create_node('#');
        if (sel) {ref.edit(sel);}
    },
    _addRootSection: function(event) {this._addTreeRootNode("#sections")},
    _addRootTag: function(event) {this._addTreeRootNode("#tags")},
    _addRootType: function(event) {this._addTreeRootNode("#know_types")},
    /**
     * @private
     * @param {refID} - char for js selector - jstree id
     * The method to uncheck jstree
    */
    clearSelectedTree: function(refID) {
        var ref = this.$(refID).jstree(true);
        ref.uncheck_all();
        ref.save_state()
        this.reload();
    },
    _clearSections: function(event) {this.clearSelectedTree('#sections')},
    _clearTags: function(event) {this.clearSelectedTree('#tags')},
    _clearTypes: function(event) {this.clearSelectedTree('#know_types')},
    /*
     * @private
     * The method search sections in jstree
    */
    _onSearchSection(event) {
        this.$('#sections').jstree(true).uncheck_all();
        var searchString = this.$('#knowsystem_section_search')[0].value;
        if (searchString) {
           $(this.$('#sections')).jstree('search', searchString);
        }
        else {
            $(this.$('#sections')).jstree('clear_search');
        }
        this.reload();
    },
    /*
     * @private
     * The method to manage keyup on search input > if enter then make search
    */
    _onKeyUpSectionSearch(event) {
        if (event.keyCode === 13) {
            this._onSearchSection();
        };
    },
    /*
     * @private
     * The method to clear seach input and clear jstree search
    */
    _onClearSearchSection(even) {
        $(this.$('#knowsystem_tag_search'))[0].value = "";
        $(this.$('#sections')).jstree('clear_search');
    },
    /*
     * @private
     * The method search tags in jstree
    */
    _onSearchTag(event) {
        this.$('#tags').jstree(true).uncheck_all();
        var searchString = this.$('#knowsystem_tag_search')[0].value;
        if (searchString) {
           $(this.$('#tags')).jstree('search', searchString);
        }
        else {
            $(this.$('#tags')).jstree('clear_search');
        }
        this.reload();
    },
    /*
     * @private
     * The method to manage keyup on search input > if enter then make search
    */
    _onKeyUpTagSearch(event) {
        if (event.keyCode === 13) {
            this._onSearchTag();
        };
    },
    /*
     * @private
     * The method to clear seach input and clear jstree search
    */
    _onClearSearchTag(even) {
        $(this.$('#knowsystem_tag_search'))[0].value = "";
        $(this.$('#tags')).jstree('clear_search');
    },

    /**
     * @private
     * @param {MouseEvent} event
     * The method to open article template wizard
    */
    async _onKnowSystemCreateFromTemplate(event) {
        var action_id = await this._rpc({
            model: "knowsystem.article",
            method: 'select_template',
            args: [[]],
            context: {},
        });
        this.do_action(action_id);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to add an article to selection
    */
    _articleSelected: function(event) {
        event.stopPropagation();
        var eventData = event.data;
        var addToSelection = eventData.selected;
        if (addToSelection) {this.selectedRecords.push(eventData.resID);}
        else {this.selectedRecords = _.without(this.selectedRecords, eventData.resID);};
        this._renderRightNavigationPanel();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to add all articles to selection
     * IMPORTANT: can't use res_ids since it only the first page --> so we rpc search
    */
    async addAll2SelectedArticles(event) {
        event.stopPropagation();
        var data = this.model.get(this.handle);
        var resIDS = await this._rpc({
            model: "knowsystem.article",
            method: 'rerurn_all_pages_ids',
            args: [this.selectedRecords, this.model.localData[data.id].domain],
        });
        this.selectedRecords = resIDS;
        this.renderer.updateSelection(resIDS);
        this._renderRightNavigationPanel();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to remove all articles from selection
    */
    _clearAllSelectedArticles: function(event) {
        event.stopPropagation();
        this.selectedRecords = [];
        this.renderer.updateSelection(this.selectedRecords);
        this._renderRightNavigationPanel();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to remove articles from selection
    */
    _removeArticleSelected: function(event) {
        event.stopPropagation();
        var resID = parseInt(event.currentTarget.id);
        this.selectedRecords = _.without(this.selectedRecords, resID);
        this.renderer.updateSelection(this.selectedRecords);
        this._renderRightNavigationPanel();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open wizard of mass section and other params update
    */
    async _massUpdateSelectedArticles(event) {
        event.stopPropagation();
        var self = this;
        var view_id = await this._rpc({
            model: "knowsystem.article",
            method: 'return_mass_update_wizard',
            args: [this.selectedRecords],
        });
        var onSaved = function(record) {self.reload()};
        new dialogs.FormViewDialog(self, {
            res_model: "article.update",
            context: {'default_articles': self.selectedRecords.join()},
            title: _lt("Update articles"),
            view_id: view_id,
            readonly: false,
            shouldSaveLocally: false,
            on_saved: onSaved,
        }).open();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open adding to tour wizard
    */
    async _onAddToTour(event) {
        event.stopPropagation();
        var self = this;
        var view_id = await this._rpc({
            model: "knowsystem.article",
            method: 'return_add_to_tour_wizard',
            args: [this.selectedRecords],
        });
        var onSaved = function(record) {
            self._rpc({
                model: "knowsystem.tour",
                method: 'return_form_view',
                args: [[record.data.tour_id.res_id]],
            }).then(function (action) {self.do_action(action);});
        };
        new dialogs.FormViewDialog(self, {
            res_model: "add.to.tour",
            context: {'default_articles': self.selectedRecords.join()},
            title: _lt("Add to tour"),
            view_id: view_id,
            readonly: false,
            shouldSaveLocally: false,
            on_saved: onSaved,
        }).open();
    },
    /**
     * @private
     * @param {section}
     * @param {tag}
     * The method to print articles of a related node
    */
    async _printBatch(section, tag) {
        var action_id = await this._rpc({
            model: "knowsystem.article",
            method: 'print_articles_batch',
            args: [[], section, tag],
        });
        this.do_action(action_id);
    },

    /**
     * @private
     * @param {MouseEvent} event
     * The method to print an article
    */
    async _onKnowSystemPrint(event) {
        var action_id = await this._rpc({
            model: "knowsystem.article",
            method: 'save_as_pdf',
            args: [this.selectedRecords],
        })
        this.do_action(action_id);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to launch standard Odoo export
    */
    _onKnowSystemExport: function(event) {
        var record = this.model.get(this.handle);
        var ExportFields = ["name", "description", "kanban_manual_description", "section_id", "tag_ids"]
        new DataExport(this, record, ExportFields, this.renderer.state.groupedBy, this.getActiveDomain(), this.selectedRecords).open();
    },
    getActiveDomain: function () {return [["id", "in", this.selectedRecords]];},
    /**
     * @private
     * @param {MouseEvent} event
     * The method to bulk add articles to favourite
    */
    async _addSelectedArticles2Favourite(event) {
        event.stopPropagation();
        await this._rpc({
            model: "knowsystem.article",
            method: 'mass_add_to_favourites',
            args: [this.selectedRecords],
        });
        this.reload();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to bulk subscribe to articles
    */
    async _followSelectedArticles(event) {
        event.stopPropagation();
        await this._rpc({
            model: "knowsystem.article",
            method: 'mass_follow_articles',
            args: [this.selectedRecords],
        });
        this.reload();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to bulk unsubscribe to articles
    */
    async _unFollowSelectedArticles(event) {
        event.stopPropagation();
        await this._rpc({
            model: "knowsystem.article",
            method: 'mass_unfollow_articles',
            args: [this.selectedRecords],
        });
        this.reload();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to bulk archive articles
    */
    async _archiveSelectedArticles(event) {
        event.stopPropagation();
        await this._rpc({
            model: "knowsystem.article",
            method: 'mass_archive',
            args: [this.selectedRecords],
        });
        this.reload();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to bulk publish articles
    */
    async _archiveSelectedPublish(event) {
        event.stopPropagation();
        await this._rpc({
            model: "knowsystem.article",
            method: 'mass_publish',
            args: [this.selectedRecords],
        });
        this.reload();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to bulk duplicate articles
    */
    async _copySelectedArticles(event) {
        event.stopPropagation();
        await this._rpc({
            model: "knowsystem.article",
            method: 'mass_copy',
            args: [this.selectedRecords],
        });
        this.reload();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * @param {data}
     * The method to create a new learning tour
    */
    async _addNewTour(event, data) {
        var self = this;
        var resID = false;
        if (data && data.resID) {resID = data.resID;};
        var view_id = this._rpc({
            model: "knowsystem.tour",
            method: 'return_popup_form_view',
            args: [[]],
        });
        var onSaved = function(record) {self._renderTours();};
        new dialogs.FormViewDialog(self, {
            res_model: "knowsystem.tour",
            title: _lt("New Tour"),
            view_id: view_id,
            res_id: resID,
            readonly: false,
            shouldSaveLocally: false,
            on_saved: onSaved,
        }).open();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to process playing the tour
    */
    async _onTourClick(event) {
        event.preventDefault();
        event.stopPropagation();
        var action_id = await this._rpc({
            model: "knowsystem.tour",
            method: 'return_start_page',
            args: [[parseInt(event.currentTarget.id)]],
        });
        this.do_action(action_id);              
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to process editing the tour
    */
    _onTourRightClick: function(event) {
        event.preventDefault();
        event.stopPropagation();
        if (this.is_action_enabled('delete')) {
            this.$("#add_new_tour").trigger("click", {"resID": parseInt(event.currentTarget.id)});
        };
    },

});

export default KnowSystemKanbanController;

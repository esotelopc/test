/** @odoo-module **/

import FormController from "web.FormController";
import dialogs from "web.view_dialogs";
import Dialog from "web.Dialog";
import Pager from "web.Pager";
import { qweb, _lt } from "web.core";

const KnowSystemFormController = FormController.extend({
    events: _.extend({}, FormController.prototype.events, {"click .hide_chatter": "_onKnowSystemChatter",}),
    /**
     * Re write to save number of views
    */
    init: function (parent, model, renderer, params) {
        this._super.apply(this, arguments);
        if (this.modelName == 'knowsystem.article') {this.articleController = true;};
    },
    /**
     * Re-write to update likes when articles are switched. Also update views counter
    */
    _update: function() {
        var self = this;
        return this._super.apply(this, arguments).then(function () {
            var articleID = self.model.localData[self.handle];
            self._rpc({
                model: "knowsystem.article",
                method: 'return_complementary_data',
                args: [[articleID.data.id]],
                context: {},
            }).then(function (cdata) {
                self._updateLikes(cdata);
                self._updateArchive(cdata);
                self._updateFavourite(cdata);
                self._updatePublish(cdata);
                self._adaptContolPanelElements();
            }); 
            self._rpc({
                model: "knowsystem.article",
                method: "update_number_of_views",
                args: [[articleID.data.id]],
                context: {},
            })
        });
    },
    /**
     * Re write to add custom buttons
    */
    renderButtons: function ($node) {
        var self = this;
        $.when(this._super.apply(this, arguments)).then(function () {
            if (self.modelName == 'knowsystem.article') {
                self._renderKnowSystemButtons();
            };
        });
    },
    /**
     * Overwite to always hide standard 'Actions' and 'Print'
    */
    _getActionMenuItems: function (state) {
        return null
    },
    /**
     * The method to make wided KnowSystem actions panel
    */
    _adaptContolPanelElements: function() {
        $(".o_cp_bottom_left").addClass("know_left_control");
        $(".o_cp_bottom_right").addClass("know_right_control");            
    },
    /**
     * The method which defines all buttons available for the form view
    */
    _renderKnowSystemButtons: function() {
        var self = this;
        if (this.modelName == 'knowsystem.article') {
            var articleID = self.model.localData[self.handle];
            self._rpc({
                model: "knowsystem.article",
                method: 'return_complementary_data',
                args: [[articleID.data.id]],
                context: {},
            }).then(function (cdata) {
                var extraButtons = qweb.render("KnowSystemFormButtons", {widget: self, cdata: cdata});
                self.$buttons.find(".knowsystem_buttons").append(extraButtons);
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_create_from_template',
                    self._onKnowSystemCreateFromTemplate.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_edit_website',
                    self._onKnowSystemEditWebsite.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_make_template',
                    self._onKnowSystemMakeTemplate.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_article_revisions',
                    self._onKnowSystemRevisions.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_article_info',
                    self._onKnowSystemInfo.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_print',
                    self._onKnowSystemPrint.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_chatter',
                    self._onKnowSystemChatter.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_article_like',
                    self._onArticleLike.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_article_dislike',
                    self._onArticleDisLike.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_article_archive',
                    self._onArticleArchive.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_article_publish',
                    self._onArticlePublish.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_duplicate',
                    self._onDuplicateRecord.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_delete',
                    self._onDeleteRecord.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_mark_favourite',
                    self._onMarkFavourite.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_add_to_tour',
                    self._onAddToTour.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.form_knowsystem_restrict_access',
                    self._onOpenRights.bind(self)
                );
                self.$buttons.on(
                    'click',
                    '.open_misc_actions',
                    self._onOpenMiscActions.bind(self)
                );
                $(document).on("click", function (event) {self._onClose(event);});
            });
        };
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open website editor
    */
    async _onKnowSystemEditWebsite(event) {
        var articleID = this.model.localData[this.handle];
        var actionID = await this._rpc({
            model: "knowsystem.article",
            method: "edit_website",
            args: [[articleID.data.id]],
        });
        this.do_action(actionID);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open new article with content from tempalte
    */
    async _onKnowSystemCreateFromTemplate(event) {
        var actionID = await this._rpc({
            model: "knowsystem.article",
            method: "select_template",
            args: [[]],
        });
        this.do_action(actionID);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open new article with content from tempalte
    */
    async _onKnowSystemMakeTemplate(event) {
        var articleID = this.model.localData[this.handle];
        var actionID = await this._rpc({
            model: "knowsystem.article",
            method: "action_make_template",
            args: [[articleID.data.id]],
        });
        this.do_action(actionID);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to return revisions list
    */
    async _onKnowSystemRevisions(event) {
        var articleID = this.model.localData[this.handle];
        var revisions = await this._rpc({
            model: "knowsystem.article",
            method: "get_revisions",
            args: [[articleID.data.id]],
        });
        var $content = qweb.render("KnowSystemRevisions", {revisions: revisions,});
        var dialog = new RevisionsDialog(this, {
            title: _lt("Revisions"),
            buttons: [
                {text: _lt("Back"), classes: "btn-primary o_save_button", close: true}
            ],
            $content: $content,
            size: 'large',
            fullscreen: true,
        });
        dialog.open();

    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open stats of the article and misc info
    */
    async _onKnowSystemInfo(event) {
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var view_id = await this._rpc({
            model: "knowsystem.article",
            method: 'get_info_formview_id',
            args: [[articleID]],
        });
        new dialogs.FormViewDialog(this, {
            res_model: "knowsystem.article",
            res_id: articleID,
            context: {},
            title: _lt("Info"),
            view_id: view_id,
            shouldSaveLocally: false,
            readonly: true,
        }).open();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open user groups
    */
    async _onOpenRights(event) {
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var view_id = await this._rpc({
            model: "knowsystem.article",
            method: 'get_rights_formview_id',
            args: [[articleID]],
        })
        new dialogs.FormViewDialog(this, {
            res_model: "knowsystem.article",
            res_id: articleID,
            context: {},
            title: _lt("Info"),
            view_id: view_id,
            shouldSaveLocally: false,
            readonly: false,
        }).open();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method save article as pdf
    */
    async _onKnowSystemPrint(event) {
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var actionID = await this._rpc({
            model: "knowsystem.article",
            method: "save_as_pdf",
            args: [[articleID]],
        });
        this.do_action(actionID);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to opend discussion channel of this article
    */
    _onKnowSystemChatter: function(event) {
        var chatterDiv = this.$el.find(".knowsystem_chatter")
        if (chatterDiv.hasClass("knowsystem_hidden")) {chatterDiv.removeClass("knowsystem_hidden")}
        else {chatterDiv.addClass("knowsystem_hidden");}
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to mark the article as liked
    */
    async _onArticleLike(event) {
        // The method to mark the article as liked
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var cdata = await this._rpc({
            model: "knowsystem.article",
            method: 'like_the_article',
            args: [[articleID]],
        });
        this._updateLikes(cdata);
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to mark the article as disliked
    */
    async _onArticleDisLike(event) {
        var self = this;
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var cdata = await this._rpc({
            model: "knowsystem.article",
            method: 'dislike_the_article',
            args: [[articleID]],
        });
        this._updateLikes(cdata);
    },
    /**
     * @private
     * {Object} cdata
     * The method to update interfaces based on new likes data
    */
    _updateLikes: function(cdata) {
        this.$buttons.find('#knowdislike').removeClass("done_article_like");
        this.$buttons.find('#knowlike').removeClass("done_article_like");
        if (cdata.user_like) {this.$buttons.find('#knowlike').addClass("done_article_like")}
        if (cdata.user_dislike) {this.$buttons.find('#knowdislike').addClass("done_article_like")};
        var likesCounters = this.$buttons.find('#knowlike_counter');
        var dislikesCounter = this.$buttons.find('#knowdislike_counter');
        var likeCounter = this.$buttons.find('#knowlike_counter');
        var dislikeCounter = this.$buttons.find('#knowdislike_counter');
        if (likeCounter.length != 0 && dislikeCounter.length != 0) {
            likeCounter[0].innerHTML = cdata.likes_counter;
            dislikeCounter[0].innerHTML  = cdata.dislikes_counter;
        };
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to archive / restore the article
    */
    async _onArticleArchive(event) {
        event.stopPropagation();
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var cdata = await this._rpc({
            model: "knowsystem.article",
            method: 'archive_article',
            args: [[articleID]],
        });
        this._updateArchive(cdata);
    },
    /**
     * @private
     * {Object} cdata
     * The method to update 'active' value in the interface
    */
    _updateArchive : function(cdata) {
        this.$buttons.find('#article_archive').removeClass("knowsystem_hidden");
        this.$buttons.find('#article_restore').removeClass("knowsystem_hidden");
        if (cdata.active) {this.$buttons.find('#article_restore').addClass("knowsystem_hidden")}
        else {this.$buttons.find('#article_archive').addClass("knowsystem_hidden");};
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to publish / unpublish article
    */
    async _onArticlePublish(event) {
        event.stopPropagation();
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var cdata = await this._rpc({
            model: "knowsystem.article",
            method: 'publish_article',
            args: [[articleID]],
        });
        this._updatePublish(cdata);
    },
    /**
     * @private
     * {Object} cdata
     * The method to update 'website_published' value in the interface
    */
    _updatePublish: function(cdata) {
        this.$buttons.find('#article_publish').removeClass("knowsystem_hidden");
        this.$buttons.find('#article_unpublish').removeClass("knowsystem_hidden");
        if (cdata.website_published) {this.$buttons.find('#article_publish').addClass("knowsystem_hidden")}
        else {this.$buttons.find('#article_unpublish').addClass("knowsystem_hidden")};
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to add / remove articles from favourites
    */
    async _onMarkFavourite(event) {
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var cdata = await this._rpc({
            model: "knowsystem.article",
            method: 'mark_as_favourite',
            args: [[articleID]],
        });
        this._updateFavourite(cdata);
    },
    /**
     * @private
     * {Object} cdata
     * The method to update favorites in the interface
    */
    _updateFavourite: function(cdata) {
        if (cdata.favourite) {
            this.$buttons.find('#knowfavorbutton').removeClass("fa-star-o");
            this.$buttons.find('#knowfavorbutton').addClass("fa-star");
        }
        else {
            this.$buttons.find('#knowfavorbutton').removeClass("fa-star");
            this.$buttons.find('#knowfavorbutton').addClass("fa-star-o");
        };
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open tour add wizard
    */
    async _onAddToTour(event) {
        var self = this;
        var article = this.model.localData[this.handle],
            articleID = article.data.id;
        var view_id = await this._rpc({
            model: "knowsystem.article",
            method: 'return_add_to_tour_wizard',
            args: [[articleID]],
        })
        var onSaved = function(record) {
            var tourId = record.data.tour_id.res_id;
            self._rpc({
                model: "knowsystem.tour",
                method: 'return_form_view',
                args: [[tourId]],
            }).then(function (action) {self.do_action(action);});
        };
        new dialogs.FormViewDialog(this, {
            res_model: "add.to.tour",
            context: {'default_articles': articleID},
            title: _lt("Add to tour"),
            view_id: view_id,
            readonly: false,
            shouldSaveLocally: false,
            on_saved: onSaved,
        }).open();
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open article misc actions form
    */
    _onOpenMiscActions: function(event) {
        event.stopPropagation();
        var thisButton = this.$buttons.find('.open_misc_actions');
        var miscButtons = this.$buttons.find('.knowsystem_misc_actions');
        if (miscButtons.hasClass("knowsystem_hidden")) {
            miscButtons.removeClass("knowsystem_hidden");
            thisButton.addClass("highlight_button");
        }
        else {
            miscButtons.addClass("knowsystem_hidden");
            thisButton.removeClass("highlight_button");
        };
    },
    /**
     * @private
     * @param {MouseEvent} event
     * The method to hide dropdown elements under any click outside
    */
    _onClose: function () {
        var thisButton = this.$buttons.find(".open_misc_actions");
        var miscButtons = this.$buttons.find(".knowsystem_misc_actions");
        miscButtons.addClass("knowsystem_hidden");
        thisButton.removeClass("highlight_button");
    },
    /**
     * Re-write to the case of create & duplicate
    */
    _enableButtons: function () {
        this._super.apply(this, arguments);
        var self = this;
        if (this.modelName == "knowsystem.article") {
            var articleID = self.model.localData[self.handle];
            self._rpc({
                model: "knowsystem.article",
                method: "return_complementary_data",
                args: [[articleID.data.id]],
                context: {},
            }).then(function (cdata) {
                self._updateLikes(cdata);
                self._updateArchive(cdata);
                self._updateFavourite(cdata);
            });
        };
    },
});

const RevisionsDialog = Dialog.extend({
    events: _.extend({}, Dialog.prototype.events, {'click .open_revision': '_onOpenRevision'}),
    /**
     * @private
     * @param {MouseEvent} event
     * The method to open article misc actions form
    */
    async _onOpenRevision(event) {
        var articleID = parseInt($(event.target).data('id'));
        var actionID = await this._rpc({
            model: "knowsystem.article.revision",
            method: 'open_revision',
            args: [[articleID]],
            context: {},
        })
        this.do_action(actionID);
    },
});

export default KnowSystemFormController;

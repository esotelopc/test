/** @odoo-module **/

import FieldHtml from "web_editor.field.html";
import fieldRegistry from "web.field_registry";

const KnowSystemComposerHtml = FieldHtml.extend({
    /**
     * Re-write to compute whether quick articles search is required
    */
    willStart: async function () {
        await this._super();
        this.knowsystemTurn = await this._rpc({
            model: "knowsystem.section",
            method: "action_check_option",
            args: ["composer"],
        });
    },
    /**
     * Re-write to pass to Wysiwyg whether knowSystem search should be available
    */
    _getWysiwygOptions: function () {
        const options = this._super.apply(this, arguments);
        options.knowsystemTurn = this.knowsystemTurn;
        return options;
    },
    /**
     * @private
     * @param {dialog} FormViewDialog instance
     * @param {action} - char - name of action to do
     * The method to update composer body
    */
    async _onApplyArticleAction(dialog, action) {
        var insertedBlock = false;
        var record = dialog.form_view.model.get(dialog.form_view.handle);
        var articles = record.data.selected_article_ids.data;
        var articleIDS = [];
        _.each(articles, function (art) {articleIDS.push(parseInt(art.res_id))});
        var article = await this._rpc({
            model: "knowsystem.article",
            method: "proceed_article_action",
            args: [articleIDS, action],
        })
        if (article) {
            if (article.descr && article.descr.length !== 0) {
                insertedBlock = article.descr
            };
            if (article.url && article.url.length !== 0) {
                insertedBlock = article.url
            };
            if (article.attachment_ids) {
                this._onAttachmentChange(article.attachment_ids);
            };
        };
        dialog.close();
        return insertedBlock
    },
});


fieldRegistry.add("know_system_composer", KnowSystemComposerHtml);

export default KnowSystemComposerHtml;

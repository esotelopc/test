/** @odoo-module **/

import ActionMenus from "web.ActionMenus";
import { patch } from "web.utils";
import Context from "web.Context";

const components = { ActionMenus };

patch(components.ActionMenus.prototype, "knowsystem/static/src/components/action_menus.js", { 
    /**
     * Re-write to apply whether KnowSystem actions menu should be shown
     */
    async willStart() {
        await this._super.apply(this, arguments);
        this.knowsystemQuickSearch = await this._setKnowSystem(this.props);
    },
    /**
     * Re-write to apply whether KnowSystem actions menu should be shown
     */
    async willUpdateProps(nextProps) {
        await this._super.apply(this, arguments);
        this.knowsystemQuickSearch = await this._setKnowSystem(nextProps);
    },
    /**
     * @private
     * @param {Object} props
     * @returns {Promise<Object[]>}
     */
    async _setKnowSystem(props) {
        const knowsystemQuickSearch = await this.rpc({
            model: "knowsystem.section",
            method: "action_check_option",
            args: ["form"],
        })
        return knowsystemQuickSearch;
    },    
    /**
     * @private
     * @param {MouseEvent} ev
     */
    async _onOpenKnowSystem(ev) {
        ev.stopPropagation();
        const defaultTags = await this.rpc({
            model: "knowsystem.tag",
            method: "action_return_tags_for_document",
            args: [this.env.action.res_model, this.props.activeIds],
        })
        const KnowSystemContext = {
            default_tag_ids: defaultTags,
            default_no_selection: true,
            form_view_ref: "knowsystem.article_search_form_view",
        };
        const context = new Context(this.props.context, KnowSystemContext).eval();
        const action = {
            name: this.env._t("Articles Quick Search"),
            type: "ir.actions.act_window",
            res_model: "article.search",
            views: [[false, "form"]],
            target: "new",
            context: context,
        };
        this.trigger("do-action", {
            action: action,
            options: {},
        });
    },
});

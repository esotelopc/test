/** @odoo-module **/

import KnowSystemFormController from "@knowsystem/js/knowsystem_formcontroller";
import KnowSystemFormRenderer from "@knowsystem/js/knowsystem_formrenderer";
import FormView from "web.FormView";
import viewRegistry from "web.view_registry";

const KnowSystemFormView = FormView.extend({
    config: _.extend({}, FormView.prototype.config, {
        Controller: KnowSystemFormController,
        Renderer: KnowSystemFormRenderer,
    }),
});

const KnowSystemFormViewTemplate = FormView.extend({
    config: _.extend({}, FormView.prototype.config, {
        Renderer: KnowSystemFormRenderer,
    }),
});


viewRegistry.add("knowsystem_form", KnowSystemFormView);
viewRegistry.add("knowsystem_form_template", KnowSystemFormViewTemplate);

export default KnowSystemFormView;
export default KnowSystemFormViewTemplate;

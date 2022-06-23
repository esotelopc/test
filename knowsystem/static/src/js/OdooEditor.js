/** @odoo-module **/

import { OdooEditor } from "@web_editor/../lib/odoo-editor/src/OdooEditor";
import { patch } from "web.utils";
import { isEmptyBlock } from "@web_editor/../lib/odoo-editor/src/utils/utils";

patch(OdooEditor.prototype, "knowsystem/static/src/js/OdooEditor.js", {
    /* 
     * Re-write to handle not cleaned placeholder bug
     * to-do: it is temporary fix until Odoo core is not updated for iframe editors
    */
    _handleCommandHint() {
        this._super.apply(this, arguments);
        for (const hint of this.editable.querySelectorAll('.oe-hint')) {
            if (hint.classList.contains('oe-command-temporary-hint') || !isEmptyBlock(hint)) {
                this.observerUnactive();
                hint.classList.remove('oe-hint', 'oe-command-temporary-hint');
                hint.removeAttribute('placeholder');
                this.observerActive();
            }
        }

    }
});

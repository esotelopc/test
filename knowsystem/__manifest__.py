# -*- coding: utf-8 -*-
{
    "name": "KnowSystem: Knowledge Base System",
    "version": "15.0.1.1.6",
    "category": "Extra Tools",
    "author": "faOtools",
    "website": "https://faotools.com/apps/15.0/knowsystem-knowledge-base-system-571",
    "license": "Other proprietary",
    "application": True,
    "installable": True,
    "auto_install": False,
    "depends": [
        "mail",
        "web_editor",
        "web"
    ],
    "data": [
        "security/security.xml",
        "security/ir.model.access.csv",
        "views/res_config_settings.xml",
        "views/knowsystem_article_revision.xml",
        "views/knowsystem_article_template.xml",
        "wizard/create_from_template.xml",
        "views/editor/options.xml",
        "views/editor/snippets.xml",
        "views/knowsystem_article.xml",
        "views/knowsystem_section.xml",
        "views/knowsystem_tag.xml",
        "views/knowsystem_tour.xml",
        "views/ir_attachment.xml",
        "reports/article_report.xml",
        "reports/article_report_template.xml",
        "wizard/article_update.xml",
        "wizard/add_to_tour.xml",
        "wizard/article_search.xml",
        "views/menu.xml",
        "wizard/mail_compose_message.xml",
        "data/data.xml",
        "views/assets.xml",
        "views/editor/options.xml",
        "views/editor/snippets.xml"
    ],
    "assets": {
        "web.assets_backend": [
                "knowsystem/static/src/js/convert_inline.js",
                "knowsystem/static/src/js/knowsystem_html_widget.js",
                "knowsystem/static/src/js/kwowsystem_kanbancontroller.js",
                "knowsystem/static/src/js/knowsystem_kanbanmodel.js",
                "knowsystem/static/src/js/knowsystem_kanbanrecord.js",
                "knowsystem/static/src/js/knowsystem_kanbanrender.js",
                "knowsystem/static/src/js/kwowsystem_kanbanview.js",
                "knowsystem/static/src/js/knowsystem_formcontroller.js",
                "knowsystem/static/src/js/knowsystem_formrenderer.js",
                "knowsystem/static/src/js/knowsystem_formview.js",
                "knowsystem/static/src/js/many2many_kanban.js",
                "knowsystem/static/src/js/composer_html.js",
                "knowsystem/static/src/js/components/action_menus.js",
                "knowsystem/static/src/js/systray_knowsystem.js",
                "knowsystem/static/src/js/knowsystem_button.js",
                "knowsystem/static/src/css/styles.css",
        ],
        "web_editor.assets_wysiwyg": [
                "knowsystem/static/src/js/wysiwyg.js",
                "knowsystem/static/src/js/OdooEditor.js"
        ],
        "web.assets_common": [
                "knowsystem/static/src/scss/knowsystem_for_backend.scss"
        ],
        "web.report_assets_common": [
                "knowsystem/static/src/scss/knowsystem_for_backend.scss"
        ],
        "knowsystem.assets_editor": [
                "knowsystem/static/src/scss/article_editor.scss"
        ],
        "knowsystem.assets_editor_edition": [
                [
                        "include",
                        "web._assets_helpers"
                ],
                "web/static/lib/bootstrap/scss/_variables.scss",
                "knowsystem/static/src/scss/knowsystem_ui.scss"
        ],
        "web.assets_qweb": [
                "knowsystem/static/src/xml/*.xml"
        ]
},
    "demo": [
        
    ],
    "external_dependencies": {},
    "summary": "The tool to build deep and structured knowledge base for internal and external use. Knowledge System. KMS",
    "description": """
For the full details look at static/description/index.html

* Features * 

- Single-view knowledge navigation
- Fast, comfortable, and professional knowledge recording
- Get benefit from your knowledge
- &lt;i class='fa fa-dedent'&gt;&lt;/i&gt; Website documentation builder
- &lt;i class='fa fa-globe'&gt;&lt;/i&gt; Partner knowledge base portal and public knowledge system
- Interactive and evolving knowledge base
- Any business and functional area
- &lt;i class='fa fa-gears'&gt;&lt;/i&gt; Custom knowledge system attributes
- Secured and shared knowledge



#odootools_proprietary

    """,
    "images": [
        "static/description/main.png"
    ],
    "price": "268.0",
    "currency": "EUR",
    "live_test_url": "https://faotools.com/my/tickets/newticket?&url_app_id=83&ticket_version=15.0&url_type_id=3",
}
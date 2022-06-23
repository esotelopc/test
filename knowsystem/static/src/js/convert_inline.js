/** @odoo-module **/
/** mainly copied from web_editor to wotk with new classes */

const RE_PADDING = /([\d.]+)/;
const TABLE_ATTRIBUTES = {
    cellspacing: 0,
    cellpadding: 0,
    border: 0,
    width: '100%',
    align: 'center',
    role: 'presentation',
};
const TABLE_STYLES = {
    'border-collapse': 'collapse',
    'text-align': 'inherit',
    'font-size': 'unset',
    'line-height': 'unset',
};

/*
* Absoultely the same as in web_editor
*/
function _createTable(attributes = []) {
    const table = document.createElement('table');
    Object.entries(TABLE_ATTRIBUTES).forEach(([att, value]) => table.setAttribute(att, value));
    table.style.setProperty('width', '100%', 'important');
    for (const attr of attributes) {
        if (!(attr.name === 'width' && attr.value === '100%')) {
            table.setAttribute(attr.name, attr.value);
        }
    }
    if (table.classList.contains('o_layout')) {
        const layoutStyles = {...TABLE_STYLES};
        delete layoutStyles['font-size'];
        delete layoutStyles['line-height'];
        Object.entries(layoutStyles).forEach(([att, value]) => table.style[att] = value)
    } else {
        for (const styleName in TABLE_STYLES) {
            if (!('style' in attributes && attributes.style.value.includes(styleName + ':'))) {
                table.style[styleName] = TABLE_STYLES[styleName];
            }
        }
    }
    return table;
}

function addTables($editable) {
    const editable = $editable.get(0);
    for (const snippet of editable.querySelectorAll('.knowsystem_snippet_general, .o_layout')) {
        const table = _createTable(snippet.attributes);
        const row = document.createElement('tr');
        const col = document.createElement('td');
        row.appendChild(col);
        table.appendChild(row);

        for (const child of [...snippet.childNodes]) {
            col.appendChild(child);
        }
        snippet.before(table);
        snippet.remove();

        const childTables = [...col.children].filter(child => child.nodeName === 'TABLE');
        if (!childTables.length) {
            const tableB = _createTable();
            const rowB = document.createElement('tr');
            const colB = document.createElement('td');

            rowB.appendChild(colB);
            tableB.appendChild(rowB);
            for (const child of [...col.childNodes]) {
                colB.appendChild(child);
            }
            col.appendChild(tableB);
        }
    }
}


/*
* Class has changed in comparison to web_editor
* Temporary fix for inline links is introduced at the end
*/
function formatTables($editable) {
    const editable = $editable.get(0);
    const writes = [];
    for (const table of editable.querySelectorAll('table.knowsystem_snippet_general, .knowsystem_snippet_general table')) {
        const tablePaddingTop = parseFloat(_getStylePropertyValue(table, 'padding-top').match(RE_PADDING)[1]);
        const tablePaddingRight = parseFloat(_getStylePropertyValue(table, 'padding-right').match(RE_PADDING)[1]);
        const tablePaddingBottom = parseFloat(_getStylePropertyValue(table, 'padding-bottom').match(RE_PADDING)[1]);
        const tablePaddingLeft = parseFloat(_getStylePropertyValue(table, 'padding-left').match(RE_PADDING)[1]);
        const rows = [...table.querySelectorAll('tr')].filter(tr => tr.closest('table') === table);
        const columns = [...table.querySelectorAll('td')].filter(td => td.closest('table') === table);
        for (const column of columns) {
            const columnsInRow = [...column.closest('tr').querySelectorAll('td')].filter(td => td.closest('table') === table);
            const columnIndex = columnsInRow.findIndex(col => col === column);
            const rowIndex = rows.findIndex(row => row === column.closest('tr'));

            if (!rowIndex) {
                const match = _getStylePropertyValue(column, 'padding-top').match(RE_PADDING);
                const columnPaddingTop = match ? parseFloat(match[1]) : 0;
                writes.push(() => {column.style['padding-top'] = `${columnPaddingTop + tablePaddingTop}px`; });
            }
            if (columnIndex === columnsInRow.length - 1) {
                const match = _getStylePropertyValue(column, 'padding-right').match(RE_PADDING);
                const columnPaddingRight = match ? parseFloat(match[1]) : 0;
                writes.push(() => {column.style['padding-right'] = `${columnPaddingRight + tablePaddingRight}px`; });
            }
            if (rowIndex === rows.length - 1) {
                const match = _getStylePropertyValue(column, 'padding-bottom').match(RE_PADDING);
                const columnPaddingBottom = match ? parseFloat(match[1]) : 0;
                writes.push(() => {column.style['padding-bottom'] = `${columnPaddingBottom + tablePaddingBottom}px`; });
            }
            if (!columnIndex) {
                const match = _getStylePropertyValue(column, 'padding-left').match(RE_PADDING);
                const columnPaddingLeft = match ? parseFloat(match[1]) : 0;
                writes.push(() => {column.style['padding-left'] = `${columnPaddingLeft + tablePaddingLeft}px`; });
            }
        }
        writes.push(() => { table.style.removeProperty('padding'); });
    }
    writes.forEach((fn) => fn());
    for (const table of [...editable.querySelectorAll('table')].filter(n => ![...n.children].some(c => c.nodeName === 'TBODY'))) {
        const contents = [...table.childNodes];
        const tbody = document.createElement('tbody');
        tbody.style.setProperty('vertical-align', 'top');
        table.prepend(tbody);
        tbody.append(...contents);
    }
    for (const node of [...editable.querySelectorAll('*')].filter(n => (
        n.style && n.style.getPropertyValue('height') === '100%' && (
            !n.parentElement.style.getPropertyValue('height') ||
            n.parentElement.style.getPropertyValue('height').includes('%'))
    ))) {
        let parent = node.parentElement;
        let height = parent.style.getPropertyValue('height');
        while (parent && height && height.includes('%')) {
            parent = parent.parentElement;
            height = parent.style.getPropertyValue('height');
        }
        if (parent) {
            parent.style.setProperty('height', $(parent).height());
        }
    }
    for (const cell of editable.querySelectorAll('td')) {
        const alignSelf = cell.style.alignSelf;
        const justifyContent = cell.style.justifyContent;
        if (alignSelf === 'start' || justifyContent === 'start' || justifyContent === 'flex-start') {
            cell.style.verticalAlign = 'top';
        } else if (alignSelf === 'center' || justifyContent === 'center') {
            cell.style.verticalAlign = 'middle';
        } else if (alignSelf === 'end' || justifyContent === 'end' || justifyContent === 'flex-end') {
            cell.style.verticalAlign = 'bottom';
        }
    }
    for (const cell of editable.querySelectorAll('tr')) {
        const alignItems = cell.style.alignItems;
        if (alignItems === 'flex-start') {
            cell.style.verticalAlign = 'top';
        } else if (alignItems === 'center') {
            cell.style.verticalAlign = 'middle';
        } else if (alignItems === 'flex-end' || alignItems === 'baseline') {
            cell.style.verticalAlign = 'bottom';
        }
    };
    // our invention to remove empty OWL operators
    $editable.find('.oe-hint').removeClass("oe-hint");
}

// Also copied from 
let lastComputedStyleElement;
let lastComputedStyle
function _getStylePropertyValue(element, propertyName) {
    const computedStyle = lastComputedStyleElement === element ? lastComputedStyle : getComputedStyle(element)
    lastComputedStyleElement = element;
    lastComputedStyle = computedStyle;
    return computedStyle[propertyName] || element.style.getPropertyValue(propertyName);
}



export default {
	knowAddTables: addTables,
	knowFormatTables: formatTables,
}

/**
 * HTML fixtures for the layout specs.
 *
 * These mirror what smapserver2 GetHtml.java generates for select questions, so the
 * layout tests exercise the same DOM that the server sends:
 *
 *    fieldset.question[.simple-select][.or-appearance-*]
 *        fieldset
 *            legend > span.question-label
 *            div.option-wrapper > label > input + span.option-label
 *
 * A table-list group becomes a section.or-group.or-appearance-field-list holding a header
 * question (appearance "label", option labels only, no inputs) followed by one question
 * per select, each with "list-nolabel" appended to its appearance.
 *
 * Pure string builders with no DOM access, so they can also be imported from Node to
 * render a gallery of the same cases.
 */

const esc = s => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );

const SWATCH = colour => `data:image/svg+xml;utf8,${encodeURIComponent( `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="${colour}"/></svg>` )}`;
const COLOURS = [ '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#f39c12', '#16a085', '#7f8c8d', '#d35400', '#2c3e50', '#e84393' ];

/**
 * @param {string} name - the question path, used for input names
 * @param {'radio'|'checkbox'} type - input type
 * @param {Array<string>} options - option labels
 * @param {object} [opts] - options
 * @param {boolean} [opts.inputs] - false for a table-list header, which has labels only
 * @param {boolean} [opts.media] - add an image to each option
 * @return {string} the option labels
 */
export function optionLabels( name, type, options, { inputs = true, media = false } = {} ) {
    return options.map( ( o, i ) => {
        const input = inputs ? `<input type="${type}" name="${name}" value="o${i + 1}" data-type-xml="${type === 'radio' ? 'select1' : 'select'}">` : '';
        const img = media ? `<img lang="" class="active" src="${SWATCH( COLOURS[ i % COLOURS.length ] )}" alt="image">` : '';

        return `<label>${input}<span lang="" class="option-label active">${esc( o )}</span>${img}</label>`;
    } ).join( '' );
}

/**
 * The option-wrapper contents of a dynamic (itemset) select after itemset.js has populated it
 *
 * @param {string} name - question path
 * @param {'radio'|'checkbox'} type - input type
 * @param {Array<string>} options - option labels
 * @param {boolean} inputs - false for a table-list header
 * @return {string} wrapper contents
 */
export function itemsetContents( name, type, options, inputs = true ) {
    const template = `<label class="itemset-template" aria-hidden="true" aria-label="template" data-items-path="instance('choices')/root/item"><input type="${type}" name="${name}" data-name="${name}" data-type-xml="${type === 'radio' ? 'select1' : 'select'}" value=""></label>`;
    const labels = `<span class="itemset-labels" data-value-ref="name" data-label-type="itext" data-label-ref="itextId">${options.map( ( o, i ) => `<span lang="" class="option-label active" data-itext-id="c${i}">${esc( o )}</span>` ).join( '' )}</span>`;

    return template + labels + optionLabels( name, type, options, { inputs } );
}

/**
 * A select question rendered as fieldsets
 *
 * @param {object} q - question
 * @param {string} q.name - path
 * @param {'radio'|'checkbox'} [q.type] - input type
 * @param {string} [q.label] - question text, empty for none
 * @param {Array<string>} q.options - option labels
 * @param {string} [q.appearance] - space separated appearances
 * @param {string} [q.baseClass] - "simple-select" unless the appearance suppresses it
 * @param {boolean} [q.media] - option images
 * @param {boolean} [q.itemset] - dynamic options
 * @param {boolean} [q.inputs] - false for a table-list header
 * @param {string} [q.extra] - markup between the legend and the option wrapper (rank)
 * @return {string} the question
 */
export function selectQuestion( { name, type = 'radio', label = '', options, appearance = '', baseClass = 'simple-select', media = false, itemset = false, inputs = true, extra = '' } ) {
    const apps = appearance.split( ' ' ).filter( Boolean ).map( a => `or-appearance-${a}` ).join( ' ' );
    const cls = [ 'question', baseClass, apps ].filter( Boolean ).join( ' ' );
    const legend = label ? `<span lang="" class="question-label active">${esc( label )}</span>` : '';
    const contents = itemset ? itemsetContents( name, type, options, inputs ) : optionLabels( name, type, options, { inputs, media } );

    return `<fieldset class="${cls}"><fieldset><legend>${legend}</legend>${extra}<div class="option-wrapper">${contents}</div></fieldset></fieldset>`;
}

/**
 * A table-list group as GetHtml renders it
 *
 * @param {object} t - table
 * @param {string} t.name - group path
 * @param {string} [t.title] - group label
 * @param {'radio'|'checkbox'} [t.type] - input type
 * @param {Array<string>} t.options - shared choice list
 * @param {Array<string>} t.rows - question texts
 * @param {string} [t.rowAppearance] - any appearance the designer set on the selects, list-nolabel is added to it
 * @param {boolean} [t.media] - option images
 * @param {boolean} [t.itemset] - dynamic options
 * @return {string} the group
 */
export function tableList( { name, title = 'Table', type = 'radio', options, rows, rowAppearance = '', media = false, itemset = false } ) {
    const header = selectQuestion( { name: `${name}/r1_table_list_labels`, type, options, appearance: 'label', inputs: false, media, itemset } );
    const qs = rows.map( ( label, i ) => selectQuestion( {
        name: `${name}/r${i + 1}`,
        type,
        label,
        options,
        appearance: `${rowAppearance} list-nolabel`.trim(),
        media,
        itemset
    } ) ).join( '' );

    return `<section class="or-group or-appearance-field-list" name="${name}"><h4><span lang="" class="question-label active">${esc( title )}</span></h4>${header}${qs}</section>`;
}

const FIVE = [ 'Totally disagree', 'Disagree', 'Neutral', 'Agree', 'Totally agree' ];
const SHORT = [ 'Yes', 'No', 'Maybe', 'N/A' ];

/*
 * Widgets and select variants that put a legend before an option wrapper but are not
 * table-list rows.  The fix must leave every one of these exactly where it was.
 */
export const UNAFFECTED = [
    { id: 'select-one', desc: 'select_one, default appearance', html: selectQuestion( { name: '/d/a', label: 'Plain select one', options: SHORT } ) },
    { id: 'select-multiple', desc: 'select_multiple, default appearance', html: selectQuestion( { name: '/d/a', type: 'checkbox', label: 'Plain select multiple', options: SHORT } ) },
    { id: 'columns', desc: 'columns (ColumnsWidget)', widget: 'columns', html: selectQuestion( { name: '/d/a', label: 'Columns', options: FIVE, appearance: 'columns' } ) },
    { id: 'columns-3', desc: 'columns-3', widget: 'columns', html: selectQuestion( { name: '/d/a', label: 'Three columns', options: FIVE, appearance: 'columns-3' } ) },
    { id: 'columns-pack', desc: 'columns-pack', widget: 'columns', html: selectQuestion( { name: '/d/a', label: 'Packed columns', options: FIVE, appearance: 'columns-pack' } ) },
    { id: 'no-buttons', desc: 'no-buttons with images (select-media)', html: selectQuestion( { name: '/d/a', label: 'Pick an image', options: SHORT, appearance: 'columns no-buttons', media: true } ) },
    { id: 'likert', desc: 'likert', html: selectQuestion( { name: '/d/a', label: 'Likert', options: FIVE, appearance: 'likert', baseClass: '' } ) },
    { id: 'horizontal', desc: 'horizontal (server adds columns)', widget: 'columns', html: selectQuestion( { name: '/d/a', label: 'Horizontal', options: FIVE, appearance: 'horizontal columns' } ) },
    { id: 'horizontal-compact', desc: 'horizontal-compact', html: selectQuestion( { name: '/d/a', label: 'Horizontal compact', options: FIVE, appearance: 'horizontal-compact' } ) },
    { id: 'compact', desc: 'compact with images', html: selectQuestion( { name: '/d/a', label: 'Compact', options: SHORT, appearance: 'compact', baseClass: '', media: true } ) },
    { id: 'quickcompact', desc: 'quickcompact with images', html: selectQuestion( { name: '/d/a', label: 'Quick compact', options: SHORT, appearance: 'quickcompact', baseClass: '', media: true } ) },
    { id: 'image-map', desc: 'image-map (static markup)', html: selectQuestion( { name: '/d/a', label: 'Image map', options: SHORT, appearance: 'image-map' } ) },
    { id: 'literacy', desc: 'literacy', html: selectQuestion( { name: '/d/a', type: 'checkbox', label: 'Literacy', options: SHORT, appearance: 'literacy' } ) },
    { id: 'rank', desc: 'rank (input between legend and wrapper)', html: selectQuestion( { name: '/d/a', label: 'Rank', options: SHORT, appearance: '', extra: '<input type="error" class="rank hide" name="/d/a" data-type-xml="rank">' } ) },
    { id: 'trigger', desc: 'trigger / acknowledge', html: '<fieldset class="question single-select trigger"><fieldset><legend><span lang="" class="question-label active">Acknowledge</span></legend><div class="option-wrapper"><label><input value="OK" type="radio" name="/d/t" data-type-xml="string"><span class="option-label active" lang="">OK</span></label></div></fieldset></fieldset>' },
    { id: 'minimal', desc: 'minimal (label, no legend)', html: '<label class="question or-appearance-minimal"><span lang="" class="question-label active">Minimal</span><select name="/d/a" data-type-xml="select1"><option value="">...</option><option value="y">Yes</option><option value="n">No</option></select></label>' },
    { id: 'itemset', desc: 'dynamic choices (itemset)', html: selectQuestion( { name: '/d/a', label: 'Dynamic choices', options: SHORT, itemset: true } ) },
    { id: 'field-list', desc: 'select in an ordinary field-list group', html: `<section class="or-group or-appearance-field-list"><h4><span class="question-label active">Field list</span></h4>${selectQuestion( { name: '/d/g/a', label: 'In a field list', options: SHORT } )}${selectQuestion( { name: '/d/g/b', type: 'checkbox', label: 'Also in it', options: SHORT } )}</section>` },
];

const STATEMENTS = [
    'A1. Reading: I have improved my ability to understand difficult texts.',
    'A2. Writing: I can write clearer, more grammatically correct sentences.',
    'A3. Listening: I can better understand spoken discussions and presentations.'
];

/*
 * Rows the fix is aimed at.  Each must put the label to the left of the choices.
 */
export const AFFECTED = [
    { id: 'tl-radio', desc: 'table-list, select_one (customer form)', html: tableList( { name: '/d/s', title: 'Section A', options: [ 'Totally disagree', 'Disagree', 'Agree', 'Totally agree' ], rows: STATEMENTS } ) },
    { id: 'tl-checkbox', desc: 'table-list, select_multiple', html: tableList( { name: '/d/s', type: 'checkbox', options: SHORT, rows: STATEMENTS } ) },
    { id: 'tl-media', desc: 'table-list, option images', html: tableList( { name: '/d/s', options: SHORT, rows: STATEMENTS, media: true } ) },
    { id: 'tl-itemset', desc: 'table-list, dynamic choices', html: tableList( { name: '/d/s', options: SHORT, rows: STATEMENTS, itemset: true } ) },
    { id: 'tl-rtl', desc: 'table-list, right to left', dir: 'rtl', html: tableList( { name: '/d/s', options: [ 'نعم', 'لا', 'ربما' ], rows: [ 'هل تحب القراءة؟', 'هل تكتب جيدا؟', 'هل تستمع بانتباه؟' ] } ) },
    { id: 'tl-touch', desc: 'table-list, touch device', touch: true, html: tableList( { name: '/d/s', options: SHORT, rows: STATEMENTS } ) },
];

/*
 * A designer appearance on the selects inside a table-list.  GetHtml appends list-nolabel,
 * so these also get the fix.  Reported for information: how well the combination lays out
 * depends on the other appearance as much as on the fix.
 */
export const COMBINATIONS = [ 'horizontal', 'columns', 'likert', 'no-buttons' ].map( app => ( {
    id: `tl+${app}`,
    desc: `table-list + ${app}`,
    widget: app === 'columns' || app === 'horizontal' ? 'columns' : undefined,
    html: tableList( { name: '/d/s', options: SHORT, rows: STATEMENTS, rowAppearance: app === 'horizontal' ? 'horizontal columns' : app, media: app === 'no-buttons' } )
} ) );

/*
 * The table-list matrix: question text length x option label length x option count
 */
const LETTERS = 'Pneumonoultramicroscopicsilicovolcanoconiosisxyz';
export const QUESTION_TEXTS = {
    short: [ 'Age', 'Sex', 'Job' ],
    medium: STATEMENTS,
    long: STATEMENTS.map( s => `${s} ${'Please consider the whole of the course, including the tutorials, the reading list and the assessments, before answering. '.repeat( 2 )}`.trim() ),
    unbroken: [ LETTERS, `${LETTERS}Two`, `${LETTERS}Three` ]
};

export const OPTION_SETS = {
    'two-short': [ 'Yes', 'No' ],
    'four-medium': [ 'Totally disagree', 'Disagree', 'Agree', 'Totally agree' ],
    'five-long': [
        'Strongly disagree with every part of the statement',
        'Disagree with most of the statement',
        'Neither agree nor disagree with it',
        'Agree with most of the statement',
        'Strongly agree with every part of the statement'
    ],
    'ten-short': [ '1', '2', '3', '4', '5', '6', '7', '8', '9', '10' ]
};

/**
 * Form Index side panel.
 * Enabled when surveyData.showFormIndex is true.
 * Builds a persistent right-side panel of or-group / or-repeat labels.
 * Clicking a label filters the form to show only that section.
 * Repeat instances expand in the index as records are added.
 */

const formIndex = {
    /** @type {Array<{id,element,type,label,parentId}>} */
    _nodes: [],
    /** @type {Array<{nodeId, label}>} breadcrumb stack */
    _focusStack: [],
    /** @type {Element} */
    _formEl: null,
    /** @type {Element} */
    _panelEl: null,
    /** @type {Element} */
    _listEl: null,
    /** @type {Element} */
    _backBtn: null,

    /**
     * @param {Element} formEl - the <form class="or"> element
     */
    init( formEl ) {
        this._formEl = formEl;
        this._buildNodes();
        this._createPanel();
        this._renderList( null, this._listEl );
        this._attachHandlers();
        document.body.classList.add( 'has-form-index' );
        if ( formEl.classList.contains( 'pages' ) ) {
            document.body.classList.add( 'form-index-replaces-pages' );
        }
    },

    _buildNodes() {
        this._nodes = [];
        let id = 0;
        const seenRepeats = new Set();

        [ ...this._formEl.querySelectorAll( '.or-group, .or-repeat' ) ]
            .filter( el => {
                if ( el.classList.contains( 'or-repeat-info' ) ) return false;
                if ( el.closest( '.disabled' ) ) return false;
                if ( el.classList.contains( 'or-repeat' ) ) {
                    const name = el.getAttribute( 'name' );
                    if ( seenRepeats.has( name ) ) return false;
                    seenRepeats.add( name );
                }

                return true;
            } )
            .forEach( el => {
                const parentEl = el.parentElement && el.parentElement.closest( '.or-group, .or-repeat' );
                const parentNode = parentEl ? this._nodes.find( n => n.element === parentEl ) : null;
                this._nodes.push( {
                    id: id++,
                    element: el,
                    type: el.classList.contains( 'or-repeat' ) ? 'repeat' : 'group',
                    label: this._getLabel( el ),
                    parentId: parentNode ? parentNode.id : null,
                } );
            } );

        // Collapse groups that are just wrappers around a same-named repeat.
        // Enketo wraps every begin-repeat in an .or-group with the same XPath name;
        // that group holds the label <h4> while the .or-repeat is the real repeat.
        const wrapperIds = new Set();
        this._nodes
            .filter( n => n.type === 'group' )
            .forEach( groupNode => {
                const name = groupNode.element.getAttribute( 'name' );
                const repeatChild = this._nodes.find(
                    n => n.parentId === groupNode.id &&
                        n.type === 'repeat' &&
                        n.element.getAttribute( 'name' ) === name
                );
                if ( repeatChild ) {
                    repeatChild.parentId = groupNode.parentId;
                    repeatChild.label = groupNode.label;
                    repeatChild.element = groupNode.element; // focus the wrapper, not just the first instance
                    wrapperIds.add( groupNode.id );
                    // Re-parent any other children of the collapsed group
                    this._nodes
                        .filter( n => n.parentId === groupNode.id && n !== repeatChild )
                        .forEach( n => { n.parentId = groupNode.parentId; } );
                }
            } );
        this._nodes = this._nodes.filter( n => !wrapperIds.has( n.id ) );
    },

    _getLabel( el ) {
        const candidates = [
            el.querySelector( ':scope > h4 .question-label.active' ),
            el.querySelector( ':scope > h4' ),
            el.querySelector( ':scope > .question-label.active' ),
            el.querySelector( ':scope > .or-hint.active' ),
        ];
        for ( const c of candidates ) {
            const text = c && c.textContent && c.textContent.trim();
            if ( text ) return this._trunc( text );
        }

        const name = el.getAttribute( 'name' ) || el.getAttribute( 'data-name' ) || '';

        return name.split( '/' ).pop() || '?';
    },

    _trunc( s, max = 40 ) {
        return s.length > max ? s.slice( 0, max ) + '…' : s;
    },

    _createPanel() {
        this._panelEl = document.createElement( 'aside' );
        this._panelEl.className = 'form-index-panel';
        this._panelEl.innerHTML =
            '<div class="fi-header">' +
                '<span class="fi-title">Index</span>' +
                '<label class="fi-expand-label">' +
                    '<input type="checkbox" class="fi-expand-cb"> Expand all' +
                '</label>' +
            '</div>' +
            '<nav class="fi-nav">' +
                '<button class="fi-show-all">&#8635; Show all</button>' +
                '<button class="fi-back" hidden>&#8592; Back</button>' +
            '</nav>' +
            '<ul class="fi-list"></ul>';
        document.body.appendChild( this._panelEl );
        this._listEl = this._panelEl.querySelector( '.fi-list' );
        this._backBtn = this._panelEl.querySelector( '.fi-back' );
        this._showAllBtn = this._panelEl.querySelector( '.fi-show-all' );
    },

    _renderList( parentId, containerEl ) {
        containerEl.innerHTML = '';
        this._nodes
            .filter( n => n.parentId === parentId )
            .forEach( node => containerEl.appendChild( this._makeItem( node ) ) );
    },

    _makeItem( node ) {
        const li = document.createElement( 'li' );
        li.className = `fi-item fi-item--${ node.type }`;
        li.dataset.nodeId = node.id;

        const label = document.createElement( 'span' );
        label.className = 'fi-label';
        label.textContent = node.label;
        li.appendChild( label );

        const hasGroupChildren = this._nodes.some( n => n.parentId === node.id );
        if ( hasGroupChildren || node.type === 'repeat' ) {
            const ul = document.createElement( 'ul' );
            ul.className = 'fi-children';
            ul.hidden = true;
            if ( node.type === 'repeat' ) {
                this._fillRepeatInstances( node, ul );
            } else {
                this._renderList( node.id, ul );
            }
            li.appendChild( ul );
        }

        return li;
    },

    _fillRepeatInstances( node, ul ) {
        ul.innerHTML = '';
        const name = node.element.getAttribute( 'name' );
        const instances = [ ...this._formEl.querySelectorAll( `.or-repeat[name="${ name }"]` ) ];
        instances.forEach( ( inst, idx ) => {
            const li = document.createElement( 'li' );
            li.className = 'fi-item fi-item--instance';
            li.dataset.nodeId = node.id;
            li.dataset.instanceIndex = idx;
            const span = document.createElement( 'span' );
            span.className = 'fi-label';
            span.textContent = `${ node.label } (${ idx + 1 })`;
            li.appendChild( span );
            ul.appendChild( li );
        } );
    },

    _attachHandlers() {
        this._panelEl.addEventListener( 'click', e => {
            const li = e.target.closest( '.fi-item' );
            if ( li ) this._onItemClick( li );
        } );
        this._backBtn.addEventListener( 'click', () => this._goBack() );
        this._showAllBtn.addEventListener( 'click', () => {
            this._focusStack = [];
            this._clearFocus();
            this._updateBackBtn();
        } );
        this._panelEl.querySelector( '.fi-expand-cb' ).addEventListener( 'change', e => {
            this._expandAll( e.target.checked );
        } );
        this._formEl.addEventListener( 'addrepeat', e => this._refreshRepeat( e.target ) );
        this._formEl.addEventListener( 'removerepeat', e => this._refreshRepeat( e.target ) );
    },

    _onItemClick( liEl ) {
        const nodeId = parseInt( liEl.dataset.nodeId, 10 );
        const instanceIndex = liEl.dataset.instanceIndex !== undefined
            ? parseInt( liEl.dataset.instanceIndex, 10 )
            : null;
        const node = this._nodes.find( n => n.id === nodeId );
        if ( !node ) return;

        let targetEl = node.element;
        if ( instanceIndex !== null ) {
            const name = node.element.getAttribute( 'name' );
            const instances = [ ...this._formEl.querySelectorAll( `.or-repeat[name="${ name }"]` ) ];
            targetEl = instances[ instanceIndex ] || node.element;
        }

        this._focusSection( targetEl );

        // Reveal children in index
        const childList = liEl.querySelector( '.fi-children' );
        if ( childList ) childList.hidden = false;

        // Update breadcrumb (instances don't push to stack)
        if ( instanceIndex === null ) {
            this._focusStack.push( { nodeId, label: node.label } );
            this._updateBackBtn();
        }
    },

    _focusSection( targetEl ) {
        this._clearFocus();

        // Collect targetEl and all its or-group/or-repeat ancestors up to .or
        const keepChain = [ targetEl ];
        let ancestor = targetEl.parentElement;
        while ( ancestor && !ancestor.classList.contains( 'or' ) ) {
            if ( ancestor.classList.contains( 'or-group' ) || ancestor.classList.contains( 'or-repeat' ) ) {
                keepChain.push( ancestor );
            }
            ancestor = ancestor.parentElement;
        }

        // For each element in the chain, hide its siblings
        keepChain.forEach( el => {
            const parent = el.parentElement;
            if ( !parent ) return;
            [ ...parent.children ].forEach( child => {
                if ( child === el ) return;
                if ( child.classList.contains( 'or-repeat-info' ) ) return;
                child.classList.add( 'form-index-hidden' );
            } );
        } );

        targetEl.classList.add( 'form-index-focus' );
        targetEl.scrollIntoView( { behavior: 'smooth', block: 'start' } );
    },

    _clearFocus() {
        this._formEl.querySelectorAll( '.form-index-hidden' ).forEach( el =>
            el.classList.remove( 'form-index-hidden' )
        );
        this._formEl.querySelectorAll( '.form-index-focus' ).forEach( el =>
            el.classList.remove( 'form-index-focus' )
        );
    },

    _goBack() {
        this._focusStack.pop();
        this._updateBackBtn();
        if ( this._focusStack.length === 0 ) {
            this._clearFocus();
        } else {
            const top = this._focusStack[ this._focusStack.length - 1 ];
            const node = this._nodes.find( n => n.id === top.nodeId );
            if ( node ) this._focusSection( node.element );
        }
    },

    _updateBackBtn() {
        this._backBtn.hidden = this._focusStack.length === 0;
        if ( this._focusStack.length > 1 ) {
            const prev = this._focusStack[ this._focusStack.length - 2 ];
            this._backBtn.textContent = `← ${ prev.label }`;
        } else {
            this._backBtn.textContent = '← Back';
        }
    },

    _expandAll( expanded ) {
        this._panelEl.querySelectorAll( '.fi-children' ).forEach( ul => {
            ul.hidden = !expanded;
        } );
    },

    _refreshRepeat( repeatEl ) {
        const name = repeatEl.getAttribute( 'name' );
        const node = this._nodes.find( n => n.type === 'repeat' && n.element.getAttribute( 'name' ) === name );
        if ( !node ) return;
        const liEl = this._panelEl.querySelector( `.fi-item--repeat[data-node-id="${ node.id }"]` );
        if ( !liEl ) return;
        let ul = liEl.querySelector( '.fi-children' );
        if ( !ul ) {
            ul = document.createElement( 'ul' );
            ul.className = 'fi-children';
            liEl.appendChild( ul );
        }
        const wasHidden = ul.hidden;
        this._fillRepeatInstances( node, ul );
        ul.hidden = wasHidden;
    },
};

export default formIndex;

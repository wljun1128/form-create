import {
    $set,
    deepExtend,
    errMsg,
    extend,
    isNumeric,
    isUndef,
    isValidChildren,
    toLine,
    toString,
    uniqueId
} from '@form-create/utils';

export default class Handler {
    constructor(fc, _rule, Render, noValue) {
        const rule = parseRule(_rule, fc.vm, noValue);

        this.fc = fc;
        this.rule = rule;
        this.noValue = noValue;
        this.type = toString(rule.type).toLowerCase();
        this.isDef = true;
        this.vm = fc.vm;
        this.el = {};
        this.watch = [];
        this.root = [];
        this.orgChildren = [];

        if (!rule.field && noValue) {
            this.field = '_def_' + uniqueId();
            this.isDef = false;
        } else {
            this.field = rule.field;
        }

        this.init();
        const id = uniqueId();
        this.id = id;
        this.unique = 'fc_' + id;
        this.key = 'key_' + id;
        this.refName = '__' + this.field + this.id;

        if (isUndef(rule.props.elementId)) $set(rule.props, 'elementId', this.unique);

        this.refresh();
        this.render = new Render(this);
    }

    refresh() {
        const rule = this.rule;
        this.parseValue = this.toFormValue(rule.value);
        this.orgChildren = isValidChildren(rule.children) ? [...rule.children] : [];
        this.deleted = false;

        return this;
    }

    init() {}

    toFormValue(value) {
        return value;
    }

    toValue(parseValue) {
        return parseValue;
    }

    setValue(value) {
        this.rule.value = value;
        this.vm._changeValue(this.field, value);
    }

    getValue() {
        return this.vm._value(this.field);
    }

    watchValue(n) {
        $set(this.rule, 'value', n);
        this.vm._changeFormData(this.field, this.toFormValue(n));
    }

    watchFormValue(n) {}

    reset() {
        this.vm._changeValue(this.field, this.defaultValue);
        this.clearMsg();
    }

    clearMsg() {
        let refName = 'fItem' + this.refName,
            fItem = this.vm.$refs[refName];
        if (fItem) {
            fItem.validateMessage = '';
            fItem.validateState = '';
            fItem.validateDisabled = true;
        }
    }

    mounted() {
        let refName = 'fItem' + this.refName,
            vm = this.vm;
        this.el = vm.$refs[this.refName] || {};
        if (this.defaultValue === undefined)
            this.defaultValue = this.toValue(
                vm.$refs[refName] && !isUndef(vm.$refs[refName].initialValue)
                    ? vm.$refs[refName].initialValue
                    : deepExtend({}, {value: this.rule.value}).value
            );
    }

    $emit(eventName, ...params) {
        eventName = `fc:${eventName}`;
        if (this.type === 'template' && this.rule.template) this.rule.vm.$emit(eventName, ...params);
        else if (this.noValue === true && this.el.$emit) this.el.$emit(eventName, ...params);
    }
}

function defRule() {
    return {
        validate: [],
        // event: {},
        col: {},
        emit: [],
        props: {},
        on: {},
        options: [],
        title: '',
        value: '',
        field: '',
        className: ''
    };
}

function parseRule(rule, vm, noVal) {
    const def = defRule();
    Object.keys(def).forEach(k => {
        if (isUndef(rule[k])) $set(rule, k, def[k]);
    });
    const parseRule = {
        col: parseCol(rule.col),
        props: parseProps(rule.props),
        emitEvent: parseEmit(rule.field, rule.emitPrefix, rule.emit, vm),
        validate: parseArray(rule.validate),
        options: parseArray(rule.options)
    };

    // parseRule.event = extend(rule.event, parseRule.emitEvent);
    parseRule.on = parseOn(rule.on, parseRule.emitEvent);

    Object.keys(parseRule).forEach(k => {
        $set(rule, k, parseRule[k]);
    });

    if (!rule.field && !noVal) {
        console.error('规则的 field 字段不能空' + errMsg());
    }

    return rule;
}

function parseOn(on, emitEvent) {
    if (Object.keys(emitEvent).length > 0) extend(on, emitEvent);
    return on;
}

function parseArray(validate) {
    return Array.isArray(validate) ? validate : [];
}

function parseEmit(field, emitPrefix, emit, vm) {
    let event = {};

    if (!Array.isArray(emit)) return event;

    emit.forEach(eventName => {
        const fieldKey = toLine(`${field}-${eventName}`).replace('_', '-');

        const emitKey = emitPrefix ? `${emitPrefix}-`.toLowerCase() + toLine(eventName) : emitPrefix;

        event[eventName] = (...arg) => {
            vm.$emit(fieldKey, ...arg);
            if (emitKey && fieldKey !== emitKey) vm.$emit(emitKey, ...arg);
        };
    });

    return event;
}

function parseEvent(event) {
    Object.keys(event).forEach(function(eventName) {
        const _name = toString(eventName).indexOf('on-') === 0 ? eventName : `on-${eventName}`;

        if (_name !== eventName) {
            $set(event, _name, event[eventName]);
        }
    });

    return event;
}

function parseProps(props) {
    if (isUndef(props.hidden)) $set(props, 'hidden', false);
    if (isUndef(props.visibility)) $set(props, 'visibility', false);

    return props;
}

function parseCol(col) {
    if (isNumeric(col)) {
        return {span: col};
    } else if (col.span === undefined) $set(col, 'span', 24);

    return col;
}

import OpenRosaXPath from './xpath/openrosa-xpath';

// This file is separated so it can be easily overwritten with a different XPath evaluator.

/**
 * @function xpath-evaluator-binding
 */
export default function( ) {
    const evaluator = OpenRosaXPath();
    this.xml.jsEvaluate = evaluator.evaluate;
}

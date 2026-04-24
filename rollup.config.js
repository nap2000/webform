import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'app.js',
    output: {
        file: 'build/js/enketo-bundle.js',
        format: 'iife',
        inlineDynamicImports: true
    },
    plugins: [
        resolve( {
            mainFields: [ 'browser', 'module', 'main' ],
            browser: true,
        } ),
        commonjs( {
            include: [ 'node_modules/**', 'src/js/xpath/**' ],
            sourceMap: false,
        } )
    ]
};

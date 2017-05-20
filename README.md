enketo-core Smap Fork
================

A fork of Enketo Core. Unless you are working with the Smap Server specifically you should probably be forking the original enketo-core repository.

Follow the [Smap blog](http://blog.smap.com.au) or go to the web site at [Smap](http://www.smap.com.au) to stay up to date.

I would like to acknowledge the work of Martin Van de Rijdt in creating this library.


        name": "satellite",
        "tiles": "GOOGLE_SATELLITE"
} ]
```

For GMaps layers you have the four options as tiles values: `"GOOGLE_SATELLITE"`, `"GOOGLE_ROADMAP"`, `"GOOGLE_HYBRID"`, `"GOOGLE_TERRAIN"`. You can also add other TileJSON properties, such as minZoom, maxZoom, id to all layers. 

#### googleApiKey
The Google API key that is used for geolocation (in the geo widgets' search box). Can be obtained [here](https://console.developers.google.com/project). Make sure to enable the _GeoCoding API_ service. If you are using Google Maps layers, the same API key is used. Make sure to enable the _Google Maps JavaScript API v3_ service as well in that case (see next item).

#### validateContinuously
This setting with the default `false` value determines whether Enketo should validate questions immediately if a related value changes. E.g. if question A has a constraint that depends on question B, this mode would re-validate question A if the value for question B changes. **This mode will slow down form traversal.** When set to `false` that type of validation is only done at the end when the Submit button is clicked or in Pages mode when the user clicks Next.

#### validatePage
This setting with default `true` value determines whether the Next button should trigger validation of the current page and block the user from moving to the next page if validation fails.

### Form Configuration

Per-form configuration is done by adding an (optional) options object as 3rd parameter when instantiating a form.

#### Behaviour of skip logic

```
    new Form(formselector, data, { 
        clearIrrelevantImmediately: false
    });
```

If `clearIrrelevantImmediately` is set to `true` or not set at all, Enketo will clear the value of a question as soon as it becomes irrelevant, after loading (so while the user traverses the form). If it is set to `false` Enketo will leave the values intact (and just hide the question).

In the second case the irrelevant values will not be cleared until `form.validate()` is called (usually when the user marks a record as complete).

### How to develop Enketo Core

1. install [node](http://nodejs.org/) and [grunt-cli](http://gruntjs.com/getting-started)
2. install dependencies with `npm install`
3. build with `grunt`
4. start built-in auto-reloading development server with `grunt develop` 
5. browse to [http://localhost:8005/forms/index.html](http://localhost:8005/forms/index.html)

### How to create or extend widgets

To create new widgets, we recommend using this [plugin template](https://gist.github.com/MartijnR/6943281). The option {touch: [boolean]}, is added automatically to all widgets to indicate whether the client is using a touchscreen device.

Each widget needs to fulfill following requirements:

* be an CommonJS/AMD-compliant jQuery plugin
* it needs to return an object with its own name and selector-to-instantiate with
* path to stylesheet scss file relative to the widget's own folder to be added in [_widgets.scss](./src/sass/core/_widgets.scss) (this will be automated in the future)
* be responsive up to a minimum window width of 320px
* use JSDoc style documentation for the purpose of passing the Google Closure Compiler without warnings and errors
* if hiding the original input element, it needs to load the default value from that input element into the widget
* if hiding the original input element, it needs to keep it synchronized and trigger a change event on the original whenever it updates
* it is recommended to apply the `widget` css class to any new elements it adds to the DOM (but not to their children)
* new input/select/textarea elements inside widgets need to get the `ignore` class
* it requires the following methods (which can be automatically obtained by extending the Widget base class as demonstrated in the [plugin template](https://gist.github.com/MartijnR/6943281)
	* `destroy(element)` to totally destroy widgets in *repeat* groups/questions when these groups/questions are cloned This may be an empty function if:
		* a deep `$.clone(true, true)` of the widget (incl data and eventhandlers) works without problems (problems are likely!)
	* `enable()` to enable the widget when a disabled ancestor gets enabled. This may be an empty function if that happens automatically.
	* `disable()` This may be an empty function if the widgets gets disabled automatically cross-browser when its branch becomes irrelevant.
	* `update()` to update the widget when called after the content used to instantiate it has changed (language or options). In its simplest form this could simply call destroy() and then re-initialize the widget, or be an empty function if language changes are handled automatically and it is not a `<select>` widget.
* any eventhandlers added to the original input should be namespaced (if extending the Widget base class, the namespace is available as `this.namespace`)
* if the widget needs tweaks or needs to be disabled for mobile (touchscreen) use, build this in. The option `{ touch: [boolean] }` is passed to the plugin by default. If your widget requires tweaks for mobile, you could create an all-in-one widget using the `options.touch` check or you could create separate widgets for desktop and mobile (as done with select-desktop and select-mobile widgets)
* allow clearing of the original input (i.e. setting value to '')
* send a `fakefocus` and `fakeblur` event to the original input when the widget gets focus or looses it (see select-desktop)
* please write test specs in the widget's /test folder.....(yeah, need to do that for the existing widgets too...)

### Notes for All Developers

* build with grunt
* helpful to use `grunt develop` to automatically compile (sass and js) when a source file changes, serve, and refresh
* adding the querystring `touch=true` and reducing the window size allows you to simulate mobile touchscreens

### Notes for JavaScript Developers

* The JS library uses CommonJS modules, but all the modules are still AMD-compliant. It may be quite a bit of work to get them working properly using requirejs though (AMD-specific issues won't be fixed by us, but AMD-specific patches/PRs are welcome)
* Will be moving back to Google Closure (Advanced Mode) in future (hence JSDoc comments should be maintained)
* Still trying to find a JS Documentation system to use that likes Closure-style JSDoc
* JavaScript style see [JsBeautifier](./.jsbeautifyrc) config file, the jsbeautifier check is added to the grunt `test` task. You can also manually run `grunt jsbeautifier:fix` to fix style issues.
* Testing is done with Jasmine and Karma (all: `grunt karma`, headless: `grunt karma:headless`, browsers: `grunt karma:browsers`)
* When making a pull request, please add tests where relevant

### Notes for CSS Developers

The core can be fairly easily extended with alternative themes. 
See the *plain*, the *grid*, and the *formhub* themes already included in [/src/sass](./src/sass). 
We would be happy to discuss whether your contribution should be a part of the core, the default theme or be turned into a new theme. 

For custom themes that go beyond just changing colors and fonts, keep in mind all the different contexts for a theme:

1. non-touchscreen vs touchscreen (add ?touch=true during development)
2. default one-page-mode and multiple-pages-mode
3. right-to-left form language vs left-to-right form language (!) - also the UI-language may have a different directionality
4. screen view vs. print view
5. questions inside a (nested) repeat group have a different background
6. large screen size --> smaller screen size ---> smallest screen size 
7. question in valid vs. invalid state


/*!
 * # Semantic UI 2.1.7 - Visibility
 * http://github.com/semantic-org/semantic-ui/
 *
 *
 * Copyright 2015 Contributors
 * Released under the MIT license
 * http://opensource.org/licenses/MIT
 *
 */

;(function ( $, window, document, undefined ) {

"use strict";

$.fn.visibility = function(parameters) {
  var
    $allModules    = $(this),
    moduleSelector = $allModules.selector || '',

    time           = new Date().getTime(),
    performance    = [],

    query          = arguments[0],
    methodInvoked  = (typeof query == 'string'),
    queryArguments = [].slice.call(arguments, 1),
    returnedValue
  ;

  $allModules
    .each(function() {
      var
        settings        = ( $.isPlainObject(parameters) )
          ? $.extend(true, {}, $.fn.visibility.settings, parameters)
          : $.extend({}, $.fn.visibility.settings),

        className       = settings.className,
        namespace       = settings.namespace,
        error           = settings.error,
        metadata        = settings.metadata,

        eventNamespace  = '.' + namespace,
        moduleNamespace = 'module-' + namespace,

        $window         = $(window),

        $module         = $(this),
        $context        = $(settings.context),

        $placeholder,

        selector        = $module.selector || '',
        instance        = $module.data(moduleNamespace),

        requestAnimationFrame = window.requestAnimationFrame
          || window.mozRequestAnimationFrame
          || window.webkitRequestAnimationFrame
          || window.msRequestAnimationFrame
          || function(callback) { setTimeout(callback, 0); },

        element         = this,
        disabled        = false,

        observer,
        module
      ;

      module = {

        initialize: function() {
          module.debug('Initializing', settings);

          module.setup.cache();

          if( module.should.trackChanges() ) {

            if(settings.type == 'image') {
              module.setup.image();
            }
            if(settings.type == 'fixed') {
              module.setup.fixed();
            }

            if(settings.observeChanges) {
              module.observeChanges();
            }
            module.bind.events();
          }

          module.save.position();
          if( !module.is.visible() ) {
            module.error(error.visible, $module);
          }

          if(settings.initialCheck) {
            module.checkVisibility();
          }
          module.instantiate();
        },

        instantiate: function() {
          module.debug('Storing instance', module);
          $module
            .data(moduleNamespace, module)
          ;
          instance = module;
        },

        destroy: function() {
          module.verbose('Destroying previous module');
          if(observer) {
            observer.disconnect();
          }
          $window
            .off('load'   + eventNamespace, module.event.load)
            .off('resize' + eventNamespace, module.event.resize)
          ;
          $context
            .off('scrollchange' + eventNamespace, module.event.scrollchange)
						.off('horizontalscrollchange' + eventNamespace, module.event.horizontalscrollchange)
          ;
          $module
            .off(eventNamespace)
            .removeData(moduleNamespace)
          ;
        },

        observeChanges: function() {
          if('MutationObserver' in window) {
            observer = new MutationObserver(function(mutations) {
              module.verbose('DOM tree modified, updating visibility calculations');
              module.timer = setTimeout(function() {
                module.verbose('DOM tree modified, updating sticky menu');
                module.refresh();
              }, 100);
            });
            observer.observe(element, {
              childList : true,
              subtree   : true
            });
            module.debug('Setting up mutation observer', observer);
          }
        },

        bind: {
          events: function() {
            module.verbose('Binding visibility events to scroll and resize');
            if(settings.refreshOnLoad) {
              $window
                .on('load'   + eventNamespace, module.event.load)
              ;
            }
            $window
              .on('resize' + eventNamespace, module.event.resize)
            ;
            // pub/sub pattern
            $context
              .off('scroll'      + eventNamespace)
              .on('scroll'       + eventNamespace, module.event.scroll)
              .on('scrollchange' + eventNamespace, module.event.scrollchange)
							.on('horizontalscrollchange' + eventNamespace, module.event.horizontalscrollchange)
            ;
          }
        },

        event: {
          resize: function() {
            module.debug('Window resized');
            if(settings.refreshOnResize) {
              requestAnimationFrame(module.refresh);
            }
          },
          load: function() {
            module.debug('Page finished loading');
            requestAnimationFrame(module.refresh);
          },
          // publishes scrollchange event on one scroll
          scroll: function() {
            if(settings.throttle) {
              clearTimeout(module.timer);
              module.timer = setTimeout(function() {
								$context.triggerHandler('scrollchange' + eventNamespace, [ $context.scrollTop(), $context.scrollLeft() ]);
              }, settings.throttle);
            }
            else {
              requestAnimationFrame(function() {
								$context.triggerHandler('scrollchange' + eventNamespace, [ $context.scrollTop(), $context.scrollLeft() ]);
              });
            }
          },
          // subscribes to scrollchange
          scrollchange: function(event, scrollPosition) {
            module.checkVisibility(scrollPosition);
          },
        },

        precache: function(images, callback) {
          if (!(images instanceof Array)) {
            images = [images];
          }
          var
            imagesLength  = images.length,
            loadedCounter = 0,
            cache         = [],
            cacheImage    = document.createElement('img'),
            handleLoad    = function() {
              loadedCounter++;
              if (loadedCounter >= images.length) {
                if ($.isFunction(callback)) {
                  callback();
                }
              }
            }
          ;
          while (imagesLength--) {
            cacheImage         = document.createElement('img');
            cacheImage.onload  = handleLoad;
            cacheImage.onerror = handleLoad;
            cacheImage.src     = images[imagesLength];
            cache.push(cacheImage);
          }
        },

        enableCallbacks: function() {
          module.debug('Allowing callbacks to occur');
          disabled = false;
        },

        disableCallbacks: function() {
          module.debug('Disabling all callbacks temporarily');
          disabled = true;
        },

        should: {
          trackChanges: function() {
            if(methodInvoked) {
              module.debug('One time query, no need to bind events');
              return false;
            }
            module.debug('Callbacks being attached');
            return true;
          }
        },

        setup: {
          cache: function() {
            module.cache = {
              occurred : {},
              screen   : {},
              element  : {},
            };
          },
          image: function() {
            var
              src = $module.data(metadata.src)
            ;
            if(src) {
              module.verbose('Lazy loading image', src);
              settings.once           = true;
              settings.observeChanges = false;

              // show when top visible
              settings.onOnScreen = function() {
                module.debug('Image on screen', element);
                module.precache(src, function() {
                  module.set.image(src);
                });
              };
            }
          },
          fixed: function() {
            module.debug('Setting up fixed');
            settings.once           = false;
            settings.observeChanges = false;
            settings.initialCheck   = true;
            settings.refreshOnLoad  = true;
            if(!parameters.transition) {
              settings.transition = false;
            }
            module.create.placeholder();
            module.debug('Added placeholder', $placeholder);
            settings.onTopPassed = function() {
              module.debug('Element passed, adding fixed position', $module);
              module.show.placeholder();
              module.set.fixed();
              if(settings.transition) {
                if($.fn.transition !== undefined) {
                  $module.transition(settings.transition, settings.duration);
                }
              }
            };
            settings.onTopPassedReverse = function() {
              module.debug('Element returned to position, removing fixed', $module);
              module.hide.placeholder();
              module.remove.fixed();
            };
          }
        },

        create: {
          placeholder: function() {
            module.verbose('Creating fixed position placeholder');
            $placeholder = $module
              .clone(false)
              .css('display', 'none')
              .addClass(className.placeholder)
              .insertAfter($module)
            ;
          }
        },

        show: {
          placeholder: function() {
            module.verbose('Showing placeholder');
            $placeholder
              .css('display', 'block')
              .css('visibility', 'hidden')
            ;
          }
        },
        hide: {
          placeholder: function() {
            module.verbose('Hiding placeholder');
            $placeholder
              .css('display', 'none')
              .css('visibility', '')
            ;
          }
        },

        set: {
          fixed: function() {
            module.verbose('Setting element to fixed position');
            $module
              .addClass(className.fixed)
              .css({
                position : 'fixed',
                top      : settings.offset + 'px',
                left     : 'auto',
                zIndex   : '1'
              })
            ;
          },
          image: function(src) {
            $module
              .attr('src', src)
            ;
            if(settings.transition) {
              if( $.fn.transition !== undefined ) {
                $module.transition(settings.transition, settings.duration);
              }
              else {
                $module.fadeIn(settings.duration);
              }
            }
            else {
              $module.show();
            }
          }
        },

        is: {
          onScreen: function() {
            var
              calculations   = module.get.elementCalculations()
            ;
            return calculations.onScreen;
          },
          offScreen: function() {
            var
              calculations   = module.get.elementCalculations()
            ;
            return calculations.offScreen;
          },
          visible: function() {
            if(module.cache && module.cache.element) {
              return !(module.cache.element.width === 0 && module.cache.element.offset.top === 0);
            }
            return false;
          }
        },

        refresh: function() {
          module.debug('Refreshing constants (width/height)');
          if(settings.type == 'fixed') {
            module.remove.fixed();
            module.remove.occurred();
          }
          module.reset();
          module.save.position();
          if(settings.checkOnRefresh) {
            module.checkVisibility();
          }
          settings.onRefresh.call(element);
        },

        reset: function() {
          module.verbose('Reseting all cached values');
          if( $.isPlainObject(module.cache) ) {
            module.cache.screen = {};
            module.cache.element = {};
          }
        },

        checkVisibility: function(scrollTop, scrollLeft) {
          module.verbose('Checking visibility of element', module.cache.element);

          if( !disabled && module.is.visible() ) {

            // save scrollTop position
            module.save.scroll(scrollTop);
						// save scrollLeft position
						module.save.horizontalScroll(scrollLeft);

            // update calculations derived from scroll
            module.save.calculations();

            // percentage
            module.passed();
						module.horizontalPassing();

            // reverse (must be first)
            module.passingReverse();
            module.topVisibleReverse();
            module.bottomVisibleReverse();
            module.topPassedReverse();
            module.bottomPassedReverse();
						module.rightVisibleReverse();
						module.leftVisibleReverse();
						module.rightPassedReverse();
						module.leftPassedReverse();

            // one time
            module.onScreen();
            module.offScreen();
            module.passing();
						module.topVisible();
            module.bottomVisible();
            module.topPassed();
            module.bottomPassed();
						module.rightVisible();
						module.leftVisible();
						module.rightPassed();
						module.leftPassed();

            // on update callback
            if(settings.onUpdate) {
              settings.onUpdate.call(element, module.get.elementCalculations());
            }
          }
        },

				horizontalPassed: function(amount, newCallback) {
          var
            calculations   = module.get.elementCalculations(),
            amountInPixels
          ;
          // assign callback
          if(amount && newCallback) {
            settings.onHorizontalPassed[amount] = newCallback;
          }
          else if(amount !== undefined) {
            return (module.get.horizontalPixelsPassed(amount) > calculations.horizontalPixelsPassed);
          }
          else if(calculations.horizontalPassing) {
            $.each(settings.onHorizontalPassed, function(amount, callback) {
              if(calculations.rightVisible || calculations.horizontalPixelsPassed > module.get.horizontalPixelsPassed(amount)) {
                module.execute(callback, amount);
              }
              else if(!settings.once) {
                module.remove.occurred(callback);
              }
            });
          }
        },

        passed: function(amount, newCallback) {
          var
            calculations   = module.get.elementCalculations(),
            amountInPixels
          ;
          // assign callback
          if(amount && newCallback) {
            settings.onPassed[amount] = newCallback;
          }
          else if(amount !== undefined) {
            return (module.get.pixelsPassed(amount) > calculations.pixelsPassed);
          }
          else if(calculations.passing) {
            $.each(settings.onPassed, function(amount, callback) {
              if(calculations.bottomVisible || calculations.pixelsPassed > module.get.pixelsPassed(amount)) {
                module.execute(callback, amount);
              }
              else if(!settings.once) {
                module.remove.occurred(callback);
              }
            });
          }
        },

        onScreen: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onOnScreen,
            callbackName = 'onScreen'
          ;
          if(newCallback) {
            module.debug('Adding callback for onScreen', newCallback);
            settings.onOnScreen = newCallback;
          }
          if(calculations.onScreen) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return calculations.onOnScreen;
          }
        },

        offScreen: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onOffScreen,
            callbackName = 'offScreen'
          ;
          if(newCallback) {
            module.debug('Adding callback for offScreen', newCallback);
            settings.onOffScreen = newCallback;
          }
          if(calculations.offScreen) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return calculations.onOffScreen;
          }
        },

        passing: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onPassing,
            callbackName = 'passing'
          ;
          if(newCallback) {
            module.debug('Adding callback for passing', newCallback);
            settings.onPassing = newCallback;
          }
          if(calculations.passing) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return calculations.passing;
          }
        },

				horizontalPassing: function(newCallback) {
					var
					calculations = module.get.elementCalculations(),
					callback     = newCallback || settings.onHorizontalPassing,
					callbackName = 'horizontalPassing'
					;
					if(newCallback) {
						debugger;
						module.debug('Adding callback for horizontal passing', newCallback);
						settings.onHorizontalPassing = newCallback;
					}
					if(calculations.horizontalPassing) {
						module.execute(callback, callbackName);
					}
					else if(!settings.once) {
						module.remove.occurred(callbackName);
					}
					if(newCallback !== undefined) {
						return calculations.horizontalPassing;
					}
				},


        topVisible: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopVisible,
            callbackName = 'topVisible'
          ;
          if(newCallback) {
            module.debug('Adding callback for top visible', newCallback);
            settings.onTopVisible = newCallback;
          }
          if(calculations.topVisible) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.topVisible;
          }
        },

				rightVisible: function(newCallback) {
					var
						calculations = module.get.elementCalculations(),
						callback     = newCallback || settings.onRightVisible,
						callbackName = 'rightVisible'
					;
					if(newCallback) {
						module.debug('Adding callback for right visible', newCallback);
						settings.onRightVisible = newCallback;
					}
					if(calculations.rightVisible) {
						module.execute(callback, callbackName);
					}
					else if(!settings.once) {
						module.remove.occurred(callbackName);
					}
					if(newCallback === undefined) {
						return calculations.rightVisible;
					}
				},

        bottomVisible: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomVisible,
            callbackName = 'bottomVisible'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom visible', newCallback);
            settings.onBottomVisible = newCallback;
          }
          if(calculations.bottomVisible) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.bottomVisible;
          }
        },

				leftVisible: function(newCallback) {
					var
						calculations = module.get.elementCalculations(),
						callback     = newCallback || settings.onLeftVisible,
						callbackName = 'leftVisible'
					;
					if(newCallback) {
						module.debug('Adding callback for left visible', newCallback);
						settings.onLeftVisible = newCallback;
					}
					if(calculations.leftVisible) {
						module.execute(callback, callbackName);
					}
					else if(!settings.once) {
						module.remove.occurred(callbackName);
					}
					if(newCallback === undefined) {
						return calculations.leftVisible;
					}
				},

        topPassed: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopPassed,
            callbackName = 'topPassed'
          ;
          if(newCallback) {
            module.debug('Adding callback for top passed', newCallback);
            settings.onTopPassed = newCallback;
          }
          if(calculations.topPassed) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.topPassed;
          }
        },

				rightPassed: function(newCallback) {
					var
					calculations = module.get.elementCalculations(),
					callback     = newCallback || settings.onRightPassed,
					callbackName = 'rightPassed'
					;
					if(newCallback) {
						module.debug('Adding callback for right passed', newCallback);
						settings.onRightPassed = newCallback;
					}
					if(calculations.rightPassed) {
						module.execute(callback, callbackName);
					}
					else if(!settings.once) {
						module.remove.occurred(callbackName);
					}
					if(newCallback === undefined) {
						return calculations.rightPassed;
					}
				},

        bottomPassed: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomPassed,
            callbackName = 'bottomPassed'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom passed', newCallback);
            settings.onBottomPassed = newCallback;
          }
          if(calculations.bottomPassed) {
            module.execute(callback, callbackName);
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return calculations.bottomPassed;
          }
        },

				leftPassed: function(newCallback) {
					var
					calculations = module.get.elementCalculations(),
					callback     = newCallback || settings.onLeftPassed,
					callbackName = 'leftPassed'
					;
					if(newCallback) {
						module.debug('Adding callback for left passed', newCallback);
						settings.onLeftPassed = newCallback;
					}
					if(calculations.leftPassed) {
						module.execute(callback, callbackName);
					}
					else if(!settings.once) {
						module.remove.occurred(callbackName);
					}
					if(newCallback === undefined) {
						return calculations.leftPassed;
					}
				},

        passingReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onPassingReverse,
            callbackName = 'passingReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for passing reverse', newCallback);
            settings.onPassingReverse = newCallback;
          }
          if(!calculations.passing) {
            if(module.get.occurred('passing')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback !== undefined) {
            return !calculations.passing;
          }
        },

				horizontalPassingReverse: function(newCallback) {
					var
					calculations = module.get.elementCalculations(),
					callback     = newCallback || settings.onHorizontalPassingReverse,
					callbackName = 'horizontalPassingReverse'
					;
					if(newCallback) {
						module.debug('Adding callback for horizontal passing reverse', newCallback);
						settings.onHorizontalPassingReverse = newCallback;
					}
					if(!calculations.horizontalPassing) {
						if(module.get.occurred('horizontalPassing')) {
							module.execute(callback, callbackName);
						}
					}
					else if(!settings.once) {
						module.remove.occurred(callbackName);
					}
					if(newCallback !== undefined) {
						return !calculations.horizontalPassing;
					}
				},

        topVisibleReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopVisibleReverse,
            callbackName = 'topVisibleReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for top visible reverse', newCallback);
            settings.onTopVisibleReverse = newCallback;
          }
          if(!calculations.topVisible) {
            if(module.get.occurred('topVisible')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.topVisible;
          }
        },

				rightVisibleReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onRightVisibleReverse,
            callbackName = 'rightVisibleReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for right visible reverse', newCallback);
            settings.onRightVisibleReverse = newCallback;
          }
          if(!calculations.topVisible) {
            if(module.get.occurred('topVisible')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.topVisible;
          }
        },

        bottomVisibleReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomVisibleReverse,
            callbackName = 'bottomVisibleReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom visible reverse', newCallback);
            settings.onBottomVisibleReverse = newCallback;
          }
          if(!calculations.bottomVisible) {
            if(module.get.occurred('bottomVisible')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.bottomVisible;
          }
        },

				leftVisibleReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onLeftVisibleReverse,
            callbackName = 'leftVisibleReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for left visible reverse', newCallback);
            settings.onLeftVisibleReverse = newCallback;
          }
          if(!calculations.topVisible) {
            if(module.get.occurred('topVisible')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.topVisible;
          }
        },

        topPassedReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onTopPassedReverse,
            callbackName = 'topPassedReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for top passed reverse', newCallback);
            settings.onTopPassedReverse = newCallback;
          }
          if(!calculations.topPassed) {
            if(module.get.occurred('topPassed')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.onTopPassed;
          }
        },

				rightPassedReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onRightPassedReverse,
            callbackName = 'rightPassedReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for right passed reverse', newCallback);
            settings.onRightPassedReverse = newCallback;
          }
          if(!calculations.topPassed) {
            if(module.get.occurred('topPassed')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.onTopPassed;
          }
        },

        bottomPassedReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onBottomPassedReverse,
            callbackName = 'bottomPassedReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for bottom passed reverse', newCallback);
            settings.onBottomPassedReverse = newCallback;
          }
          if(!calculations.bottomPassed) {
            if(module.get.occurred('bottomPassed')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.bottomPassed;
          }
        },

				leftPassedReverse: function(newCallback) {
          var
            calculations = module.get.elementCalculations(),
            callback     = newCallback || settings.onLeftPassedReverse,
            callbackName = 'leftPassedReverse'
          ;
          if(newCallback) {
            module.debug('Adding callback for left passed reverse', newCallback);
            settings.onLeftPassedReverse = newCallback;
          }
          if(!calculations.topPassed) {
            if(module.get.occurred('topPassed')) {
              module.execute(callback, callbackName);
            }
          }
          else if(!settings.once) {
            module.remove.occurred(callbackName);
          }
          if(newCallback === undefined) {
            return !calculations.onTopPassed;
          }
        },

        execute: function(callback, callbackName) {
          var
            calculations = module.get.elementCalculations(),
            screen       = module.get.screenCalculations()
          ;
          callback = callback || false;
          if(callback) {
            if(settings.continuous) {
              module.debug('Callback being called continuously', callbackName, calculations);
              callback.call(element, calculations, screen);
            }
            else if(!module.get.occurred(callbackName)) {
              module.debug('Conditions met', callbackName, calculations);
              callback.call(element, calculations, screen);
            }
          }
          module.save.occurred(callbackName);
        },

        remove: {
          fixed: function() {
            module.debug('Removing fixed position');
            $module
              .removeClass(className.fixed)
              .css({
                position : '',
                top      : '',
                left     : '',
                zIndex   : ''
              })
            ;
          },
          occurred: function(callback) {
            if(callback) {
              var
                occurred = module.cache.occurred
              ;
              if(occurred[callback] !== undefined && occurred[callback] === true) {
                module.debug('Callback can now be called again', callback);
                module.cache.occurred[callback] = false;
              }
            }
            else {
              module.cache.occurred = {};
            }
          }
        },

        save: {
          calculations: function() {
            module.verbose('Saving all calculations necessary to determine positioning');
            module.save.direction();
						module.save.horizontalDirection();
            module.save.screenCalculations();
            module.save.elementCalculations();
          },
          occurred: function(callback) {
            if(callback) {
              if(module.cache.occurred[callback] === undefined || (module.cache.occurred[callback] !== true)) {
                module.verbose('Saving callback occurred', callback);
                module.cache.occurred[callback] = true;
              }
            }
          },
          scroll: function(scrollPosition) {
            scrollPosition      = scrollPosition + settings.offset || $context.scrollTop() + settings.offset;
            module.cache.scroll = scrollPosition;
          },
					horizontalScroll: function(scrollPosition) {
						scrollPosition                = scrollPosition + settings.horizontalOffset || $context.scrollLeft() + settings.horizontalOffset;
						module.cache.horizontalScroll = scrollPosition;
					},
          direction: function() {
            var
              scroll     = module.get.scroll(),
              lastScroll = module.get.lastScroll(),
              direction
            ;
            if(scroll > lastScroll && lastScroll) {
              direction = 'down';
            }
            else if(scroll < lastScroll && lastScroll) {
              direction = 'up';
            }
            else {
              direction = 'static';
            }
            module.cache.direction = direction;
            return module.cache.direction;
          },
					horizontalDirection: function () {
						var
							scroll     = module.get.horizontalScroll(),
							lastScroll = module.get.lastHorizontalScroll(),
							direction
						;
						if(scroll > lastScroll && lastScroll) {
							direction = 'right';
						}
						else if(scroll < lastScroll && lastScroll) {
							direction = 'left';
						}
						else {
							direction = 'static';
						}
						module.cache.horizontalDirection = direction;
						return module.cache.horizontalDirection;
					},
          elementPosition: function() {
            var
              element = module.cache.element,
              screen  = module.get.screenSize()
            ;
            module.verbose('Saving element position');
            // (quicker than $.extend)
            element.fits            = (element.height < screen.height);
						element.fitsHorizontal  = (element.width < screen.width);
            element.offset          = $module.offset();
            element.width           = $module.outerWidth();
            element.height          = $module.outerHeight();
            // store
            module.cache.element = element;
            return element;
          },
          elementCalculations: function() {
            var
              screen     = module.get.screenCalculations(),
              element    = module.get.elementPosition()
            ;
            // offset
            if(settings.includeMargin) {
              element.margin          = {};
							element.margin.top      = parseInt($module.css('margin-top'), 10);
              element.margin.right    = parseInt($module.css('margin-right'), 10);
							element.margin.left     = parseInt($module.css('margin-left'), 10);
							element.margin.bottom   = parseInt($module.css('margin-bottom'), 10);
              element.top    = element.offset.top - element.margin.top;
							element.right  = element.offset.left + element.width + element.margin.right;
              element.bottom = element.offset.top + element.height + element.margin.bottom;
							element.left   = element.offset.left - element.margin.left;
            }
            else {
              element.top    = element.offset.top;
							element.right  = element.offset.left + element.width;
              element.bottom = element.offset.top + element.height;
							element.left   = element.offset.left;
            }

            // visibility
            element.topVisible                 = (screen.bottom >= element.top);
            element.topPassed                  = (screen.top >= element.top);
						element.bottomVisible              = (screen.bottom >= element.bottom);
						element.bottomPassed               = (screen.top >= element.bottom);
						element.leftVisible                = (screen.right >= element.left);
						element.leftPassed                 = (screen.left >= element.left);
						element.rightVisible               = (screen.right >= element.right);
						element.rightPassed                = (screen.left >= element.right);
            element.pixelsPassed               = 0;
            element.percentagePassed           = 0;
						element.horizontalPixelsPassed     = 0;
						element.horizontalPercentagePassed = 0;
            // meta calculations
            element.onScreen               = (element.topVisible && !element.bottomPassed);
						element.onScreenHorizontally   = (element.leftVisible && !element.rightPassed);
            element.passing                = (element.topPassed && !element.bottomPassed);
						element.horizontalPassing      = (element.leftPassed && !element.rightPassed);
            element.offScreen              = (!element.onScreen);
						element.offScreenHorizontally  = (!element.onScreenHorizontally);
            // passing calculations
            if(element.passing) {
              element.pixelsPassed     = (screen.top - element.top);
              element.percentagePassed = (screen.top - element.top) / element.height;
            }
						if (element.horizontalPassing) {
							element.horizontalPixelsPassed      = (screen.left - element.left);
							element.horizontalPercentagePassed  = (screen.left - element.left) / element.width;
						}
            module.cache.element = element;
            module.verbose('Updated element calculations', element);
            return element;
          },
          screenCalculations: function() {
            var
              scroll            = module.get.scroll(),
							horizontalScroll  = module.get.horizontalScroll()
            ;
            module.save.direction();
						module.save.horizontalDirection();

            module.cache.screen.top    = scroll;
						module.cache.screen.right  = horizontalScroll + module.cache.screen.width;
            module.cache.screen.bottom = scroll + module.cache.screen.height;
						module.cache.screen.left   = horizontalScroll;

            return module.cache.screen;
          },
          screenSize: function() {
            module.verbose('Saving window position');
            module.cache.screen = {
              height: $context.height(),
							width: $context.width()
            };
          },
          position: function() {
            module.save.screenSize();
            module.save.elementPosition();
          }
        },

        get: {
          pixelsPassed: function(amount) {
            var
              element = module.get.elementCalculations()
            ;
            if(amount.search('%') > -1) {
              return ( element.height * (parseInt(amount, 10) / 100) );
            }
            return parseInt(amount, 10);
          },
					horizontalPixelsPassed: function(amount) {
						var
							element = module.get.elementCalculations()
						;
						if(amount.search('%') > -1) {
							return ( element.width * (parseInt(amount, 10) / 100) );
						}
						return parseInt(amount, 10);
					},
          occurred: function(callback) {
            return (module.cache.occurred !== undefined)
              ? module.cache.occurred[callback] || false
              : false
            ;
          },
          direction: function() {
            if(module.cache.direction === undefined) {
              module.save.direction();
            }
            return module.cache.direction;
          },
					horizontalDirection: function() {
						if(module.cache.direction === undefined) {
							module.save.horizontalDirection();
						}
						return module.cache.horizontalDirection;
					},
          elementPosition: function() {
            if(module.cache.element === undefined) {
              module.save.elementPosition();
            }
            return module.cache.element;
          },
          elementCalculations: function() {
            if(module.cache.element === undefined) {
              module.save.elementCalculations();
            }
            return module.cache.element;
          },
          screenCalculations: function() {
            if(module.cache.screen === undefined) {
              module.save.screenCalculations();
            }
            return module.cache.screen;
          },
          screenSize: function() {
            if(module.cache.screen === undefined) {
              module.save.screenSize();
            }
            return module.cache.screen;
          },
          scroll: function() {
            if(module.cache.scroll === undefined) {
              module.save.scroll();
            }
            return module.cache.scroll;
          },
					horizontalScroll: function () {
						if(module.cache.horizontalScroll === undefined) {
							module.save.horizontalScroll();
						}
						return module.cache.horizontalScroll;
					},
          lastScroll: function() {
            if(module.cache.screen === undefined) {
              module.debug('First scroll event, no last scroll could be found');
              return false;
            }
            return module.cache.screen.top;
          },
					lastHorizontalScroll: function () {
						if(module.cache.screen === undefined) {
							module.debug('First horizontal scroll event, no last scroll could be found');
							return false;
						}
						return module.cache.screen.left;
					}
        },

        setting: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, settings, name);
          }
          else if(value !== undefined) {
            settings[name] = value;
          }
          else {
            return settings[name];
          }
        },
        internal: function(name, value) {
          if( $.isPlainObject(name) ) {
            $.extend(true, module, name);
          }
          else if(value !== undefined) {
            module[name] = value;
          }
          else {
            return module[name];
          }
        },
        debug: function() {
          if(settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.debug = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.debug.apply(console, arguments);
            }
          }
        },
        verbose: function() {
          if(settings.verbose && settings.debug) {
            if(settings.performance) {
              module.performance.log(arguments);
            }
            else {
              module.verbose = Function.prototype.bind.call(console.info, console, settings.name + ':');
              module.verbose.apply(console, arguments);
            }
          }
        },
        error: function() {
          module.error = Function.prototype.bind.call(console.error, console, settings.name + ':');
          module.error.apply(console, arguments);
        },
        performance: {
          log: function(message) {
            var
              currentTime,
              executionTime,
              previousTime
            ;
            if(settings.performance) {
              currentTime   = new Date().getTime();
              previousTime  = time || currentTime;
              executionTime = currentTime - previousTime;
              time          = currentTime;
              performance.push({
                'Name'           : message[0],
                'Arguments'      : [].slice.call(message, 1) || '',
                'Element'        : element,
                'Execution Time' : executionTime
              });
            }
            clearTimeout(module.performance.timer);
            module.performance.timer = setTimeout(module.performance.display, 500);
          },
          display: function() {
            var
              title = settings.name + ':',
              totalTime = 0
            ;
            time = false;
            clearTimeout(module.performance.timer);
            $.each(performance, function(index, data) {
              totalTime += data['Execution Time'];
            });
            title += ' ' + totalTime + 'ms';
            if(moduleSelector) {
              title += ' \'' + moduleSelector + '\'';
            }
            if( (console.group !== undefined || console.table !== undefined) && performance.length > 0) {
              console.groupCollapsed(title);
              if(console.table) {
                console.table(performance);
              }
              else {
                $.each(performance, function(index, data) {
                  console.log(data['Name'] + ': ' + data['Execution Time']+'ms');
                });
              }
              console.groupEnd();
            }
            performance = [];
          }
        },
        invoke: function(query, passedArguments, context) {
          var
            object = instance,
            maxDepth,
            found,
            response
          ;
          passedArguments = passedArguments || queryArguments;
          context         = element         || context;
          if(typeof query == 'string' && object !== undefined) {
            query    = query.split(/[\. ]/);
            maxDepth = query.length - 1;
            $.each(query, function(depth, value) {
              var camelCaseValue = (depth != maxDepth)
                ? value + query[depth + 1].charAt(0).toUpperCase() + query[depth + 1].slice(1)
                : query
              ;
              if( $.isPlainObject( object[camelCaseValue] ) && (depth != maxDepth) ) {
                object = object[camelCaseValue];
              }
              else if( object[camelCaseValue] !== undefined ) {
                found = object[camelCaseValue];
                return false;
              }
              else if( $.isPlainObject( object[value] ) && (depth != maxDepth) ) {
                object = object[value];
              }
              else if( object[value] !== undefined ) {
                found = object[value];
                return false;
              }
              else {
                module.error(error.method, query);
                return false;
              }
            });
          }
          if ( $.isFunction( found ) ) {
            response = found.apply(context, passedArguments);
          }
          else if(found !== undefined) {
            response = found;
          }
          if($.isArray(returnedValue)) {
            returnedValue.push(response);
          }
          else if(returnedValue !== undefined) {
            returnedValue = [returnedValue, response];
          }
          else if(response !== undefined) {
            returnedValue = response;
          }
          return found;
        }
      };

      if(methodInvoked) {
        if(instance === undefined) {
          module.initialize();
        }
        instance.save.scroll();
				instance.save.horizontalScroll();
        instance.save.calculations();
        module.invoke(query);
      }
      else {
        if(instance !== undefined) {
          instance.invoke('destroy');
        }
        module.initialize();
      }
    })
  ;

  return (returnedValue !== undefined)
    ? returnedValue
    : this
  ;
};

$.fn.visibility.settings = {

  name                       : 'Visibility',
  namespace                  : 'visibility',

  debug                      : false,
  verbose                    : false,
  performance                : true,

  // whether to use mutation observers to follow changes
  observeChanges             : true,

  // check position immediately on init
  initialCheck               : true,

  // whether to refresh calculations after all page images load
  refreshOnLoad              : true,

  // whether to refresh calculations after page resize event
  refreshOnResize            : true,

  // should call callbacks on refresh event (resize, etc)
  checkOnRefresh             : true,

  // callback should only occur one time
  once                       : true,

  // callback should fire continuously whe evaluates to true
  continuous                 : false,

  // offset to use with scroll top
  offset                     : 0,

	// offset to use with scroll left
	horizontalOffset           : 0,

  // whether to include margin in elements position
  includeMargin              : false,

  // scroll context for visibility checks
  context                    : window,

  // visibility check delay in ms (defaults to animationFrame)
  throttle                   : false,

  // special visibility type (image, fixed)
  type                       : false,

  // image only animation settings
  transition                 : 'fade in',
  duration                   : 1000,

  // array of callbacks for percentage
  onPassed                   : {},
	onHorizontalPassed         : {},

  // standard callbacks
  onOnScreen                 : false,
  onOffScreen                : false,
  onPassing                  : false,
	onHorizontalPassing        : false,
  onTopVisible               : false,
	onRightVisible             : false,
  onBottomVisible            : false,
	onLeftVisible              : false,
  onTopPassed                : false,
	onRightPassed              : false,
  onBottomPassed             : false,
	onLeftPassed               : false,

  // reverse callbacks
  onPassingReverse           : false,
	onHorizontalPassingReverse : false,
  onTopVisibleReverse        : false,
	onRightVisibleReverse      : false,
  onBottomVisibleReverse     : false,
	onLeftVisibleReverse       : false,
  onTopPassedReverse         : false,
	onRightPassedReverse       : false,
  onBottomPassedReverse      : false,
	onLeftPassedReverse        : false,

  // utility callbacks
  onUpdate                   : false, // disabled by default for performance
  onRefresh                  : function(){},

  metadata : {
    src: 'src'
  },

  className: {
    fixed       : 'fixed',
    placeholder : 'placeholder'
  },

  error : {
    method  : 'The method you called is not defined.',
    visible : 'Element is hidden, you must call refresh after element becomes visible'
  }

};

})( jQuery, window, document );

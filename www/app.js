(function() {

	'use strict';

	var app = angular.module('app', [
			'ui.router',
			'AppControllers',
			'ngResource',
		]);

	angular.module('AppControllers',[]);
	angular.module('AppDirectives',[]); /*er*/
	angular.module('AppServices',['ngResource']);
	angular.module('AppFilters',[]);

    app.config(function($stateProvider) {

      $stateProvider
        .state('app', {
          url: '',
          templateUrl: './templates/app.html',
          controller: 'AppController'
        })
    });

    var controllers = angular.module('AppControllers');

    controllers.controller('AppController', function($scope) {


    });


})();

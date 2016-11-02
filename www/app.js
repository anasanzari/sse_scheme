(function() {

	'use strict';

	var app = angular.module('app', [
			'ui.router',
			'AppControllers',
			'ngResource',
			'ngFileUpload'
		]);

	angular.module('AppControllers',[]);
	angular.module('AppDirectives',[]); /*er*/
	angular.module('AppServices',['ngResource']);
	angular.module('AppFilters',[]);

    app.config(function($stateProvider) {

      $stateProvider
        .state('app', {
          url: '',
		  abstract: true,
          templateUrl: './templates/app.html',
          controller: 'AppController'
        })
		.state('demp',{
			url: '',
			parent: 'app',
			templateUrl: './templates/demo.html',
			controller: 'DemoController'
		});
    });

    var controllers = angular.module('AppControllers');

    controllers.controller('AppController', function($scope) {


    });

	controllers.controller('DemoController', function($scope, Upload) {

		$scope.upload = function (file) {
			if (!$scope.myform.file.$valid || !$scope.docid) {
				return;
			}
	        Upload.upload({
	            url: './setup',
	            data: {file: file, 'docid': $scope.docid}
	        }).then(function (resp) {
	            console.log(resp);
				$scope.indexdb = resp.data;
	        }, function (resp) {
	            console.log('Error status: ' + resp.status);
	        }, function (evt) {
	        });
	    };

    });


})();

(function() {

	'use strict';

	var app = angular.module('app', [
			'ui.router',
			'AppControllers',
			'AppServices',
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

	controllers.controller('DemoController', function($scope, Upload, RestService) {

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

		$scope.encrypt = function(){
	        RestService.send(function(data) {
	            $scope.edb = data;
	            console.log(data);
	          },
	          function(err) {
	            console.log(err);
	          }
	        );
		};

    });

	var services = angular.module('AppServices');

    services.factory('RestService', function($resource) {
      return $resource('', {}, {
        send: {
          method: 'POST',
          cache: false,
          isArray: true,
		  'url' : './send'
        }
      });
    });


})();

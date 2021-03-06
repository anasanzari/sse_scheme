(function() {

	'use strict';

	var app = angular.module('app', [
			'ui.router',
			'AppControllers',
			'AppServices',
			'AppDirectives',
			'ngResource',
			'ngAnimate',
			'ngFileUpload',
			'ui.bootstrap'
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
		.state('demo',{
			url: '/demo',
			parent: 'app',
			templateUrl: './templates/demo.html',
			controller: 'DemoController'
		})
		.state('details',{
			url: '',
			parent: 'app',
			templateUrl: './templates/details.html'
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

		$scope.search = function(t){
			console.log('searching for '+t);
			var data = {term:t};
			RestService.search(data,function(data) {
				$scope.search_results = data;
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
	  	},
		search: {
          method: 'POST',
          cache: false,
          isArray: true,
		  'url' : './search'
        }
      });
    });

	var directives = angular.module('AppDirectives');
	directives.directive('tex', function() {
	  var refresh = function(element) {
	      MathJax.Hub.Queue(["Typeset", MathJax.Hub, element]);
	  };
	  return {
		restrict : 'EA',
		transclude: true,
	    link: function(scope, element, attrs) {
	        refresh(element[0]);
	    },
	    template : '<div ng-transclude></div>'

	  };
	});


})();

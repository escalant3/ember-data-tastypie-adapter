# ember-data-tastypie-adapter


## Motivation
- django-tastypie is one of the most widely used libraries to provide a REST interface from a django App.
- The ember-data default RESTAdapter does not follow the conventions used in django-tastypie.
- Instead of forcing the django developer to adapt tastypie to ember-data conventions, this adapter does the dirty work.


## Usage

#### Javascript side 

- You can either import the lib/tastypie_adapter.js file or use the ember-data-tastypie-adapter package on your build process.

- To use the adapter with your store:

Basic code to use it with the last ember-data revision:
	
	  App.store = DS.Store.create({
 		revision: 4,
    	adapter: DS.DjangoTastypieAdapter.create({
   		})
  	  });

Creating with several parameters:
	
	  App.store = DS.Store.create({
 		revision: 4,
    	adapter: DS.DjangoTastypieAdapter.create({
    	  serverDomain: "http://localhost:8000",
    	  tastypieApiUrl: "api/v1"
   		})
  	  });


#### python/django side
The standard django-tastypie configuration will do the work. However, some details are important:

i) ember-data always expect data in return (except in deletions). Make sure to configure your Resources with the meta option if you are going to perform POST or PUT operations:


	class Meta:
		always_return_data = True
	
	
ii) obviously, the permissions must be configured in the server to allow GET, POST, PUT and DELETE methods to provide fully access to CRUD operations. Usually, django-tastypie will require an Authorization meta option to allow writing

	class Meta:
        authorization = Authorization()
        detail_allowed_methods = ['get', 'post', 'put', 'delete']
        always_return_data = True



## Contributing
This is the adapter may be useful for someone in the ember.js/django community. If you want to extend it, please open issues and send pull requests.

#### Bulk Commits note
This adapter does not support bulkCommits and does not plan to do it soon. django-tastypie REST implementation differs from the Ruby on Rails one, widely used by the ember.js community. Although bulkCommits can be implemented with PATCH operations, I didn't like the resulting adapter.


## Unit tests
Go to the tests directory and type:

	python -m SimpleHTTPServer
	
Go to http://localhost:8000/ to run the Qunit tests.

## Versions
In the meantime ember.js and ember-data reach 1.0, custom compilations have been used to test the adapter.

#### ember.js
7f2bea4cbb7e1168c1ce7df12bea35e725b16301

#### ember-data
a49dcbb357f86fc4d961198774717eda4e366dc8

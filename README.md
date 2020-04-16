[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Travis (.com)](https://img.shields.io/travis/com/iqb-berlin/testcenter-iqb-php?style=flat-square)](https://travis-ci.com/iqb-berlin/textcenter-iqb-php)

# IQB Testcenter Backend

These are the backend applications for the applications
- iqb testcenter
- iqb testcenter-admin (deprecated)

You can find frontends for those applications [here](https://github.com/iqb-berlin/testcenter-iqb-ng) 
and [here](https://github.com/iqb-berlin/testcenter-admin-iqb-ng).

# Documentation

Find API documentation [here](https://iqb-berlin.github.io/testcenter-iqb-php/).

# Installation

## With Installation Script on Webserver

### Prerequisites

* Apache2 (other Webservers possible, but untested) with
  * mod_rewrite extension
  * header extension
* PHP > 7.3 
  * pdo extension
  * json extension
  * zip extension
  * libxml extension
  * simplexml extension
  * xmlreader extension
  * apache
* MySQL or PostgreSQL
* for tests / doc-building: NPM

### Installation Steps

- Clone this repository:
```
git clone https://github.com/iqb-berlin/testcenter-iqb-php.git
```

- Install dependencies with Composer:
```
sh scripts/install_composer.sh # or install composer manually
php composer.phar install
``` 

- Make sure, Apache2 accepts `.htacess`-files (`AllowOverride All`-setting in your Vhost-config) and 
required extensions are present. *Make sure, config and data files are not exposed to the outside*. If the `.htacess`-files is
accepted by Apache2 correctly this would be the case. 

- Ensure that PHP has _write_ access to `/tmp` and `/vo_data`:
```
sudo chown -R www-data:www-data ./integration/tmp # normal apache2 config assumed
sudo chown -R www-data:www-data ./vo_data # normal apache2 config assumed
``` 
- create a MySQL or a PostgreSQL database
- Run the initialize-script, that
  - creates a superuser,
  - creates a workspace with sample data,
  - creates `config/DatabaseConnectionData.json` config file,
  - creates necessary tables in the database.
```
sudo --user=www-data php scripts/initialize.php \
    --user_name=<name your future superuser> \
    --user_password=<set up a password for him> \ 
    --workspace=<name your first workspace> \
    --test_login_name=<name the login for your sample data test> \
    --test_login_password=<password the login for your sample data test> \
    --type=<your database type: `mysql` or `pgsql`> \
    --host=<database host, `localhost` by default> \
    --post=<database port, usually and by default 3306 for mysql and 5432 for postgresl> \
    --dbname=<database name> \
    --user=<mysql-/postgresql-username> \
    --password=<mysql-/postgresql-password>
```

### Options
- See `scripts/initialize.php` for more options of the initialize-script.
- Optionally you can create the `config/DatabaseConnectionData.json` beforehand manually and omit the
corresponding argument when calling the initialize-script. Check this file if you have any trouble 
connecting to your database.
- Optionally you can create the database structure beforehand manually as well:
```
mysql -u username -p database_name < scripts/sql-schema/mysql.sql
mysql -u username -p database_name < scripts/sql-schema/patches.mysql.sql
# or
psql -U username database_name < scripts/sql-schema/postgresql.sql
psql -U username database_name < scripts/sql-schema/patches.postgresql.sql
```

## With Docker
You can find Docker files and a complete setup [here](https://github.com/iqb-berlin/iqb-tba-docker-setup). 
**(currently outdated)** 


# Tests

## Unit tests

```
vendor/bin/phpunit unit-tests
```

## E2E/API-Tests

These tests test the in-/output of all endpoints against the API Specification using [Dredd](https://dredd.org).

### Preparation:
* install Node modules
```
npm --prefix=integration install
```

* If your backend is not running under `http://localhost`, use env `TC_API_URL` variable to set up it's URI
```
export TC_API_URL=http://localhost/testcenter-iqb-php 
  &&  npm --prefix=integration run dredd_test
```

### Run the E2E/API-Tests
```
 npm --prefix=integration run dredd_test
```

### Run E2E/API-Tests against persistent database
If you want to run the e2e-tests against a persistent database, MySQL or PostgreSQL, do the following:
- in `/config` create a file `DBConnectionData.e2etest.json` analogous to `DBConnectionData.json` with your connection
- also in `/config` create a file `e2eTests.json`with the content `{"configFile": "e2etest"}`
- **Be really careful**: Running the tests this way will *erase all your data* from the data dir `vo_data` 
and the specified database.


# Development
## Coding Standards

Following [PSR-12](https://www.php-fig.org/psr/psr-12/)

Exceptions:
* private and protected class methods are prefixed with underscore to make it more visible that they are helper methods.  

Most important:
* Class names MUST be declared in StudlyCaps ([PSR-1](https://www.php-fig.org/psr/psr-1/))
* Method names MUST be declared in camelCase ([PSR-1](https://www.php-fig.org/psr/psr-1/))
* Class constants MUST be declared in all upper case with underscore separators. ([PSR-1](https://www.php-fig.org/psr/psr-1/))
* Files MUST use only UTF-8 without BOM for PHP code. ([PSR-1](https://www.php-fig.org/psr/psr-1/))
* Files SHOULD either declare symbols (classes, functions, constants, etc.) or cause side-effects (e.g. generate output, change .ini settings, etc.) but SHOULD NOT do both. ([PSR-1](https://www.php-fig.org/psr/psr-1/))

### Various Rules

* always put a white line below function signature
* use typed function signature as of php 7.1, arrays can be used as type, but will be replaced by typed array classes once 
* dont't use require or include anywhere, program uses autoload for all classes from the `classes`-dir. 
Exception: Unit-tests, where we want to define dependencies explicit in the test-file itself (and nowhere else).
 


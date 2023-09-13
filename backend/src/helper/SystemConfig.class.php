<?php
/** @noinspection PhpUnhandledExceptionInspection */

class SystemConfig {
  public static string $database_host;
  public static string $database_name;
  public static string $database_password;
  public static int $database_port;
  public static string $database_user;
  public static string $fileService_external = "";
  public static string $fileService_internal = "";
  public static string $broadcastingService_external = "";
  public static string $broadcastingService_internal = "";
  public static string $cacheService_host = "";
  public static string $password_salt = "t";
  public static bool $system_tlsEnabled = false;
  public static string $system_hostname;
  public static string $system_version;
  public static int $system_veronaMax;
  public static int $system_veronaMin;
  public static string $system_timezone = 'Europe/Berlin';
  public static bool $debug_useInsecurePasswords = false;
  public static bool $debug_allowExternalXmlSchema = true;
  public static bool $debug_useStaticTokens = false;
  public static string $debug_useStaticTime;
  public static string $language_dateFormat;
  // TODO server URL, port

  public static function read(): void {
    $config = parse_ini_file(ROOT_DIR . '/backend/config/config.ini', true, INI_SCANNER_TYPED);
    if (!$config) {
      throw new Exception('Application config file is missing!');
    }
    self::apply($config);
  }

  public static function apply(array $config): void {
    foreach ($config as $sectionName => $section) {
      foreach ($section as $key => $value) {
        $propertyKey = "{$sectionName}_$key";
        if (property_exists(self::class, $propertyKey)) {
          self::$$propertyKey = $value;
        }
      }
    }

    if (!isset(self::$system_version) or !self::$system_version) {
      self::readVersion();
    }
    self::verify();
  }

  private static function verify(): void {
    foreach (get_class_vars(self::class) as $key => $value) {
      if (!isset(self::$$key)) {
        throw new Exception("Application config parameter is missing: $key!");
      }
    }
  }

  public static function readFromEnvironment(): void {
    $config = [];

    $config['database']['name'] = getEnv('MYSQL_DATABASE');
    $config['database']['host'] = getEnv('MYSQL_HOST');
    $config['database']['port'] = getEnv('MYSQL_PORT');
    $config['database']['user'] = getEnv('MYSQL_USER');
    $config['database']['password'] = getEnv('MYSQL_PASSWORD');

    $config['passwords']['salt'] = getEnv('MYSQL_SALT');

    if (self::boolEnv('BROADCAST_SERVICE_ENABLED')) {
      $config['broadcasting_service']['external'] = self::$system_hostname . '/bs/public static';
      $config['broadcasting_service']['internal']= 'testcenter-broadcasting-service:3000';
    }

    if (self::boolEnv('FILE_SERVICE_ENABLED')) {
      $config['file_service']['external'] = self::$system_hostname . '/fs';
      $config['file_service']['internal'] = 'testcenter-file-service';
      $config['cache_service']['host'] = 'testcenter-cache-service';
    }

    $config['system']['tls_enabled'] = self::boolEnv('TLS_ENABLED');
    $config['system']['hostname'] = self::boolEnv('HOSTNAME');
    $config['system']['version'] = getEnv('VERSION');

    $config['debug'] = [
      'allow_external_xml_schema' => true,
      'use_insecure_passwords' => false,
      'use_static_tokens' => false
    ];

    self::apply($config);
  }

  public static function readVersion(): void {
    $packageJsonStr = file_get_contents(ROOT_DIR . '/package.json');
    $packageJson = JSON::decode($packageJsonStr);
    $v = "verona-player-api-versions";
    self::$system_veronaMax = $packageJson->iqb->$v->max;
    self::$system_veronaMin = $packageJson->iqb->$v->min;
    self::$system_version =  $packageJson->version;
  }

  private static function boolEnv(string $name): bool {
    return in_array(strtolower(getEnv($name)), ['on', 'true', 'yes', 1]);
  }

  public static function write(): void {
    $config = [];
    foreach (get_class_vars(self::class) as $propertyName => $value) {
      list($sectionName, $key) = explode('_', $propertyName, 2);
      $config[$sectionName][$key] = self::$$propertyName;
    }
    $output = "";
    foreach ($config as $sectionName => $section) {
      $output .= "[$sectionName]\n";
      foreach ($section as $key => $value) {
        if (($key == 'version') and (getEnv('VERSION') !== self::$system_version)) {
          continue;
        }
        $value = is_bool($value) ? ($value ? 'yes' : 'no') : $value;
        $output .= "$key=$value\n";
      }
    }
    file_put_contents(ROOT_DIR . '/backend/config/config.ini', $output);
  }

  public static function dumpDbConfig(): string {
    return print_r([
      "host" => self::$database_host,
      "user" => self::$database_user,
      "port" => self::$database_port,
      "pass" => substr(self::$database_password, 0, 2) . '***',
      "name" => self::$database_name
    ], true);
  }
}
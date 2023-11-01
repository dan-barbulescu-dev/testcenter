<?php
class Git {
  private static array $logstash = [];

  public static function init(string $dir): void {
    self::initGit($dir);
    self::configGit($dir);
    $key = self::getSSHKey($dir);
  }

  private static function initGit(string $dir): void {
    $path = DATA_DIR . "/$dir";
    if (file_exists("$path/.git")) {
      self::log($dir, '/.git exists');
    } else {
      self::exec($dir, 'git init --initial-branch=main');
    }
  }

  private static function configGit(string $dir): void {
    $path = DATA_DIR . "/$dir";
    file_put_contents("$path/.git/config", <<<TEMPLATE
            [core]
                repositoryformatversion = 0
                filemode = false
                bare = false
                logallrefupdates = true
            [branch "main"]
                remote = origin
            [pull]
                ff = only
        TEMPLATE
    );
  }

  public static function getSSHKey(string $dir = DATA_DIR): string {
    $sshPath = DATA_DIR . "/.ssh";
    if (!is_dir($sshPath)) {
      self::log($dir, "$sshPath created");
      mkdir($sshPath);
    }
    if (file_exists("$sshPath/ssh.key") and file_exists("$sshPath/ssh.key.pub")) {
      self::log($dir, "Key file already existed (`$sshPath/ssh.key`)");
    } else {
      self::exec($dir, 'ssh-keygen -t ed25519 -C "comment" -N "" -f' . $sshPath . '/ssh.key');
    }
    return file_get_contents($sshPath . '/ssh.key.pub');
  }

  public static function addRemote(string $dir, string $remote): void {
    $getOrigin = self::exec($dir, 'git remote get-url origin', true);
    if ($getOrigin === 0) {
      self::log($dir, 'origin already set');
      return;
    }
    self::exec($dir, 'git remote add origin ' . $remote);
  }

  public static function push(string $dir, string $username, string $usermail, string $message): void {
    self::add($dir);
    self::exec($dir, "git config user.name \"$username\"");
    self::exec($dir, "git config user.email \"$usermail\"");
    $staged = self::exec($dir, 'git diff --cached --shortstat');
    if (!$staged) {
      self::log($dir, 'Nothing to commit');
      return;
    }
    self::commit($dir, $message);
    self::pushRemote($dir);
  }

  private static function add(string $dir, string $pattern = '.'): void {
    self::exec($dir, "git add $pattern");
  }

  private static function commit(string $dir, string $message): void {
    self::exec($dir, "git commit -m \"$message\"");
  }

  private static function pushRemote($dir): void {
    $sshPath = DATA_DIR . "/.ssh";
    self::exec($dir, "GIT_SSH_COMMAND='ssh -o StrictHostKeyChecking=accept-new -i $sshPath/ssh.key' git push -f origin main");
  }

  public static function pull(string $dir): void {
    $sshPath = DATA_DIR . "/.ssh";
    self::exec($dir, "GIT_SSH_COMMAND='ssh  -o StrictHostKeyChecking=accept-new -i $sshPath/ssh.key' git pull --ff-only origin");
  }

  public static function exec(string $dir, string $command, bool $returnCode = false): string|int {
    $path = DATA_DIR . "/$dir";
    $cwd = getcwd();
    chdir($path);
    exec($command . ' 2>&1', $output, $return);
    $output = join("\n", $output);
    chdir($cwd);
    self::log($path, $command, $output);
    if ($returnCode) {
      return $return;
    }
    if ($return != 0) {
      throw new Exception("Error [$return] `$output`");
    }
    return $output;
  }

  private static function log(string $dir, string $command, string $result = ''): void {
    echo "\n[$command]\n$result\n";
    self::$logstash[$dir][] = [$command, $result];
  }
}

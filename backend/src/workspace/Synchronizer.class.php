<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);

// TODO unit tests !

class Synchronizer extends Workspace {
  public function instrument(string $remote): void {
    $remotes = $this->workspaceDAO->getRemotes();
    if (!count($remotes)) {
      Git::init('ws_' . $this->workspaceId);
    }
    Git::addRemote('ws_' . $this->workspaceId, $remote);
    $this->workspaceDAO->addRemote($remote);
  }

  public function synchronize(int $remoteId, string $username): void {
    $remote = $this->workspaceDAO->getRemote($remoteId);
    if (!$remote) {
      throw new HttpError("Remote `$remoteId` not found", 404);
    }
    $this->createBackup();
    Git::addRemote('ws_' . $this->workspaceId, $remote['remote']);
    Git::push('ws_' . $this->workspaceId, $username, "$username@testcenter.iqb",'Backup');
  }

  private function createBackup(): void {
    $backupPath = $this->getOrCreateSubFolderPath('Data');
    $groups = $this->workspaceDAO->getGroups();
    $hostname = SystemConfig::$system_hostname;
    foreach ([ReportType::RESPONSE, ReportType::LOG] as $type) {
      foreach ([ReportFormat::JSON, ReportFormat::CSV] as $format) {
        foreach ($groups as $group) {
          $outputFileName = "$backupPath/$hostname.$group.{$type}s.$format";
          echo "\n[$outputFileName]\n";
          $report = new Report($this->workspaceId, [$group], $type, $format);
          if (!$report->generate()) {
            echo "No data for $outputFileName!";
          }
          if ($format == ReportFormat::CSV) {
            $data = $report->asString();
          } else {
            $data = json_encode($report->reportData);
          }
          var_dump($data);
          if (false === file_put_contents($outputFileName, $data)) {
            echo "Could not write $outputFileName!";
          }
        }
      }
      $adminDao = new AdminDAO();
      $stats = $adminDao->getResultStats($this->getId());
      $statsFileName = "$backupPath/$hostname.stats.json";
      if (false === file_put_contents($statsFileName, json_encode($stats))) {
        echo "Could not write stats file `$statsFileName`!";
      }
    }
  }
}
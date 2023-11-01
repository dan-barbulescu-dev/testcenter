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
    $types = [
      new ReportType(ReportType::RESPONSE),
      new ReportType(ReportType::LOG)
    ];
    $formats = [
      new ReportFormat(ReportFormat::CSV),
      new ReportFormat(ReportFormat::JSON)
    ];
    foreach ($types as $type) {
      foreach ($formats as $format) {
        foreach ($groups as $group) {
          $typeValue = $type->getValue();
          $formatValue = $format->getValue();
          $outputFileName = "$backupPath/$hostname.$group.{$typeValue}s.$formatValue";
          echo "\n[$outputFileName]\n";
          $report = new Report($this->workspaceId, [$group], $type, $format);
          $report->setAdminDAOInstance(new AdminDAO());
          if (!$report->generate()) {
            echo "No data for $outputFileName!";
          }
          if ($formatValue == 'csv') {
            $data = $report->getCsvReportData();
          } else {
            $data = json_encode($report->getReportData());
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
        echo "Could not write stats file $outputFileName!";
      }
    }
  }
}
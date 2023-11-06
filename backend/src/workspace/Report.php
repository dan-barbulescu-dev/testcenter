<?php

declare(strict_types=1);

class Report {

  public const BOM = "\xEF\xBB\xBF";         // UTF-8 BOM for MS Excel
  public const DELIMITER = ';';              // standard delimiter for MS Excel
  public const ENCLOSURE = '"';
  public const LINE_ENDING = "\n";
  private const CSV_CELL_FORMAT = self::ENCLOSURE . "%s" . self::ENCLOSURE;

  private readonly int $workspaceId;
  private readonly array $dataIds;
  private readonly ReportType $type;
  private readonly ReportFormat $format;
  private string $csvReportData;
  public readonly array $reportData;

  function __construct(int $workspaceId, array $dataIds, ReportType $reportType, ReportFormat $reportFormat) {
    $this->workspaceId = $workspaceId;
    $this->dataIds = $dataIds;
    $this->type = $reportType;
    $this->format = $reportFormat;
  }

  public function asString(): string {
    return match ($this->format) {
      ReportFormat::CSV => $this->csvReportData,
      ReportFormat::JSON => json_encode($this->reportData)
    };
  }

  public function getReportData(): array {
    return $this->reportData;
  }

  public function generate(): bool {
    switch ($this->type) {
      case ReportType::LOG:
        $adminDAO = new AdminDAO();
        $logs = $adminDAO->getLogReportData($this->workspaceId, $this->dataIds);

        if (empty($logs)) {
          return false;

        } else {
          $this->reportData = $logs;

          if ($this->format == ReportFormat::CSV) {
            $this->csvReportData = $this->generateLogsCSVReport($logs);
          }
        }

        break;

      case ReportType::RESPONSE:
        $adminDAO = new AdminDAO();
        $responses = $adminDAO->getResponseReportData($this->workspaceId, $this->dataIds);

        if (empty($responses)) {
          return false;

        } else {
          $this->reportData = $responses;

          if ($this->format == ReportFormat::CSV) {
            $this->csvReportData = $this->generateResponsesCSVReport($responses);
          }
        }

        break;

      case ReportType::REVIEW:
        $adminDAO = new AdminDAO();
        $reviewData = $adminDAO->getReviewReportData($this->workspaceId, $this->dataIds);
        $reviewData = $this->transformReviewData($reviewData);

        if (empty($reviewData)) {
          return false;

        } else {
          $this->reportData = $reviewData;

          if ($this->format == ReportFormat::CSV) {
            $this->csvReportData = $this->generateReviewsCSVReport($reviewData);
          }
        }

        break;

      case ReportType::SYSCHECK:
        $sysChecksFolder = new SysChecksFolder($this->workspaceId);
        $systemChecks = $sysChecksFolder->collectSysCheckReports($this->dataIds);

        if (empty($systemChecks)) {
          return false;

        } else {
          $this->reportData = array_map(
            function(SysCheckReportFile $report) {
              return $report->get();
            },
            $systemChecks
          );

          if ($this->format == ReportFormat::CSV) {
            $flatReports = array_map(
              function(SysCheckReportFile $report) {
                return $report->getFlat();
              },
              $systemChecks
            );
            $this->csvReportData = self::BOM .
              CSV::build(
                $flatReports,
                [],
                self::DELIMITER,
                self::ENCLOSURE,
                self::LINE_ENDING
              );
          }
        }
        break;
    }

    return true;
  }

  private function generateLogsCSVReport(array $logData): string {
    $columns = ['groupname', 'loginname', 'code', 'bookletname', 'unitname', 'timestamp', 'logentry']; // TODO: Adjust column headers?
    $csv[] = implode(self::DELIMITER, $columns);

    foreach ($logData as $log) {
      $csv[] = implode(
        self::DELIMITER,
        [
          sprintf(self::CSV_CELL_FORMAT, $log['groupname']),
          sprintf(self::CSV_CELL_FORMAT, $log['loginname']),
          sprintf(self::CSV_CELL_FORMAT, $log['code']),
          sprintf(self::CSV_CELL_FORMAT, $log['bookletname']),
          sprintf(self::CSV_CELL_FORMAT, $log['unitname']),
          sprintf(self::CSV_CELL_FORMAT, $log['timestamp']),
          preg_replace("/\\\\\"/", '""', $log['logentry'])   // TODO: adjust replacement & use cell enclosure ?
        ]
      );
    }

    $csv = implode(self::LINE_ENDING, $csv);

    return self::BOM . $csv;
  }

  private function generateResponsesCSVReport(array $responseData): string {
    $csv[] = implode(
      self::DELIMITER,
      ['host', 'groupname', 'loginname', 'code', 'bookletname', 'unitname', 'responses', 'laststate']
    );

    foreach ($responseData as $row) {
      $csv[] = implode(
        self::DELIMITER,
        [
          sprintf(self::CSV_CELL_FORMAT, $row['host']),
          sprintf(self::CSV_CELL_FORMAT, $row['groupname']),
          sprintf(self::CSV_CELL_FORMAT, $row['loginname']),
          sprintf(self::CSV_CELL_FORMAT, $row['code']),
          sprintf(self::CSV_CELL_FORMAT, $row['bookletname']),
          sprintf(self::CSV_CELL_FORMAT, $row['unitname']),
          sprintf(self::CSV_CELL_FORMAT, preg_replace('/"/', '""', json_encode($row['responses']))),
          sprintf(self::CSV_CELL_FORMAT, preg_replace('/"/', '""', $row['laststate'] ?? ''))
        ]
      );

    }

    $csv = implode(self::LINE_ENDING, $csv);

    return self::BOM . $csv;
  }

  private function transformReviewData(array $reviewData): array {
    $transformedReviewData = [];
    $categoryKeys = $this->extractCategoryKeys($reviewData);

    foreach ($reviewData as $review) {
      $offset = array_search('categories', array_keys($review));
      $transformedReviewData[] =
        array_slice($review, 0, $offset) +
        $this->fillCategories($categoryKeys, explode(" ", $review['categories'] ?? '')) +
        array_slice($review, $offset + 1, null);
    }

    return $transformedReviewData;
  }

  private function extractCategoryKeys(array $reviewData): array {
    $categoryMap = [];

    foreach ($reviewData as $reviewEntry) {
      if (!empty($reviewEntry['categories'])) {
        $categories = explode(" ", $reviewEntry['categories']);

        foreach ($categories as $category) {
          if (0 === count(array_keys($categoryMap, $category))) {
            $categoryMap[] = $category;
          }
        }
      }
    }
    asort($categoryMap);

    return $categoryMap;
  }

  private function fillCategories(array $categoryKeys, array $categoryValues): array {
    $categories = [];

    foreach ($categoryKeys as $categoryKey) {
      $isMatch = false;

      foreach ($categoryValues as $categoryValue) {
        if ($categoryKey === $categoryValue) {
          $isMatch = true;
          break;
        }
      }
      $categories["category: " . $categoryKey] = $isMatch ? 'X' : null;
    }

    return $categories;
  }

  private function generateReviewsCSVReport(array $reviewData): string {
    $csv[] = implode(self::DELIMITER, CSV::collectColumnNamesFromHeterogeneousObjects($reviewData));   // TODO: Adjust column headers?

    foreach ($reviewData as $review) {
      $csv[] = implode(
        self::DELIMITER,
        array_map(
          function($reviewProperty) {
            return isset($reviewProperty) ? sprintf(self::CSV_CELL_FORMAT, $reviewProperty) : $reviewProperty;
          },
          $review
        )
      );
    }

    $csv = implode(self::LINE_ENDING, $csv);

    return self::BOM . $csv;
  }
}

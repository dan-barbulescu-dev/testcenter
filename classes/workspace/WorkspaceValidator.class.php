<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);
// TODO unit test


class WorkspaceValidator extends Workspace {

    public $allFiles = [];

    public $allLoginNames = [];

    private array $report = [];

    private function readFiles() {

        $this->allFiles = [];

        foreach ($this::subFolders as $type) {

            $pattern = ($type == 'Resource') ? "*.*" : "*.[xX][mM][lL]";
            $files = Folder::glob($this->getOrCreateSubFolderPath($type), $pattern);

            $this->allFiles[$type] = [];

            foreach ($files as $filePath) {

                $file = File::get($type, $filePath, true);

                if (isset($this->allFiles[$type][$file->getId()])) {

                    $double = $this->allFiles[$type][$file->getId()];
                    $this->reportError("Duplicate $type-Id: `{$file->getId()}` `({$double->getName()})`", $file->getName());
                    $this->reportError("Duplicate $type-Id: `{$double->getId()}` `({$file->getName()})`", $double->getName());
                    unset($this->allFiles[$type][$file->getId()]);

                } else {

                    $this->allFiles[$type][$file->getId()] = $file;
                }

            }

        }

//        echo "\n =====";
//        var_dump($this->allFiles);
//        echo "\n =====";
    }


    function validate(): array {

        $this->readFiles();

        $this->crossValidate();

        // cross-file checks
        $this->checkIfLoginsAreUsedInOtherWorkspaces();
        $this->checkIfGroupsAreUsedInOtherFiles();

        // find unused resources, units and booklets
        $this->findUnusedItems();


        return $this->report;
    }


    private function getReport(File $file) {

        $report = $file->getValidationReport();
        if (count($report)) {
            $this->report[$file->getName()] = $report;
        }
    }


    private function reportError(string $text, string $file = '.'): void {

        if (!isset($this->report[$file])) {
            $this->report[$file] = [];
        }
        $this->report[$file][] = new ValidationReportEntry('error', $text);
    }


    private function reportWarning(string $text, string $file = '.'): void {

        if (!isset($this->report[$file])) {
            $this->report[$file] = [];
        }
        $this->report[$file][] = new ValidationReportEntry('warning', $text);
    }


    private function reportInfo(string $text, string $file = '.'): void {

        if (!isset($this->report[$file])) {
            $this->report[$file] = [];
        }
        $this->report[$file][] = new ValidationReportEntry('info', $text);
    }


    public function getResource(string $resourceId): ?ResourceFile {

        // TODO duplicate ucase ID problem

        if (isset($this->allFiles['Resource'][$resourceId])) {
            return $this->allFiles['Resource'][$resourceId];
        }

        return null;

//        if (!$useVersioning && in_array($resourceFileNameNormalized, $this->allResources)) {
//
//            if (!in_array($resourceFileNameNormalized, $this->allUsedResources)) {
//
//                $this->allUsedResources[] = $resourceFileNameNormalized;
//            }
//
//            return true;
//
//        } else if ($useVersioning && in_array($resourceFileNameNormalized, $this->allVersionedResources)) {
//
//            if (!in_array($resourceFileNameNormalized, $this->allUsedVersionedResources)) {
//
//                $this->allUsedVersionedResources[] = $resourceFileNameNormalized;
//            }
//
//            return true;
//        }
    }


    public function getUnit(string $unitId): ?XMLFileUnit {

        if (isset($this->allFiles['Unit'][$unitId])) {
            return $this->allFiles['Unit'][$unitId];
        }

        return null;
    }


    public function getBooklet(string $bookletId): ?XMLFileBooklet {

        if (isset($this->allFiles['Booklet'][$bookletId])) {
            return $this->allFiles['Booklet'][$bookletId];
        }

        return null;
    }


//    private function readResources() {
//
//        foreach ($this->allFiles['Resource'] as $rFile) {
//
//            /* @var ResourceFile $rFile */
//            $this->allResources[] = FileName::normalize($rFile->getName(), false);
//            $this->resourceSizes[FileName::normalize($rFile->getName(), false)] = $rFile->getSize();
//            $this->allVersionedResources[] = FileName::normalize($rFile->getName(), true);
//            $this->resourceSizes[FileName::normalize($rFile->getName(), true)] = $rFile->getSize();
//        }
//
//        $this->reportInfo('`' . strval(count($this->allResources)) . '` resource files found');
//    }


    private function crossValidate(): void {

        // DO duplicate unit id // $this->reportError("Duplicate unit id `$unitId`", $entry);
        // alos add test for that!
        // DO duplicate booklet id // $this->reportError("Duplicate unit id `$unitId`", $entry);
        // DO count of teststakers

        foreach (['Resource', 'Unit', 'Booklet', 'Testtakers', 'SysCheck'] as $type) {

            $countCrossValidated = 0;

            foreach ($this->allFiles[$type] as $file) {

                /* @var File $file */

                if ($file->isValid()) {

                    $file->crossValidate($this);

                    if ($file->isValid()) {

                        $countCrossValidated += 1;
                    }
                }

                $this->getReport($file);
            }

            $this->reportInfo("`$countCrossValidated` valid $type-files found");
        }
    }





    private function checkIfLoginsAreUsedInOtherWorkspaces() {

        // TODO use TesttakersFolder

        $dataDirHandle = opendir($this->_dataPath);
        while (($workspaceDirName = readdir($dataDirHandle)) !== false) {

            if (!is_dir($this->_dataPath . '/' . $workspaceDirName) or (substr($workspaceDirName, 0, 3) !== 'ws_')) {
                continue;
            }

            $wsIdOther = intval(substr($workspaceDirName, 3));
            if (($wsIdOther < 0) or ($wsIdOther == $this->_workspaceId)) {
                continue;
            }

            $otherTesttakersFolder = $this->_dataPath . '/' . $workspaceDirName . '/Testtakers';
            if (!file_exists($otherTesttakersFolder) || !is_dir($otherTesttakersFolder)) {
                continue;
            }

            $otherTesttakersDirHandle = opendir($otherTesttakersFolder);

            while (($entry = readdir($otherTesttakersDirHandle)) !== false) {

                $fullFilename = $otherTesttakersFolder . '/' . $entry;

                if (is_file($fullFilename) && (strtoupper(substr($entry, -4)) == '.XML')) {

                    $xFile = new XMLFileTesttakers($fullFilename, true);

                    if ($xFile->isValid()) {

                        foreach($xFile->getAllLoginNames() as $loginName) {

                            if (isset($this->allLoginNames[$loginName])) {
                                $this->reportError("[`{$this->allLoginNames[$loginName]}`] login `$loginName` is 
                                    already used on other workspace `$wsIdOther` (`$entry`)", '?');
                            }
                        }
                    }
                }
            }
        }
    }


    private function checkIfGroupsAreUsedInOtherFiles() {

        $otherTesttakersFolder = new TesttakersFolder($this->_workspaceId);
        $this->allGroups = $otherTesttakersFolder->getAllGroups();

        foreach ($this->allGroups as $filePath => $groupList) {

            $fileName = basename($filePath);

            /* @var Group $group */
            foreach (TesttakersFolder::getAll() as $otherTesttakersFolder) {

                /* @var TesttakersFolder $otherTesttakersFolder */
                $allGroupsInOtherWorkspace = $otherTesttakersFolder->getAllGroups();

                foreach ($allGroupsInOtherWorkspace as $otherFilePath => $otherGroupList) {

                    if ($filePath == $otherFilePath) {
                        continue;
                    }

                    $duplicates = array_intersect_key($groupList, $otherGroupList);

                    if ($duplicates) {

                        foreach ($duplicates as $duplicate) {

                            $location = ($this->_workspaceId !== $otherTesttakersFolder->_workspaceId)
                                ? "also on workspace {$otherTesttakersFolder->_workspaceId}"
                                : '';
                            $this->reportError("Duplicate Group-Id: `{$duplicate->getName()}` - $location in file `"
                                . basename($otherFilePath) . "`", $fileName);
                        }
                    }

                }
            }
        }
    }


    private function findUnusedItems() {

        foreach (['Resource', 'Unit', 'Booklet'] as $type) {

            foreach($this->allFiles[$type] as /* @var File */ $file) {
                if ($file->isValid() and !$file->isUsed()) {
                    $this->reportWarning("$type is never used", $file->getId());
                }
            }
        }
    }
}

<?php
/** @noinspection PhpUnhandledExceptionInspection */
declare(strict_types=1);

class XMLFileTesttakers extends XMLFile {
  const type = 'Testtakers';
  const canBeRelationSubject = true;
  const canBeRelationObject = false;
  protected LoginArray $logins;

  public function crossValidate(WorkspaceCache $workspaceCache): void {
    parent::crossValidate($workspaceCache);

    $this->logins = $this->getAllLogins();
    $this->contextData['testtakers'] = count($this->logins->asArray());

    $this->checkForDuplicateLogins();

    foreach ($this->logins as $login) {
      /* @var Login $login */
      $this->checkIfBookletsArePresent($login, $workspaceCache);
    }

    $this->checkIfIdsAreUsedInOtherFiles($workspaceCache);
  }

  private function checkForDuplicateLogins(): void {
    $doubleLogins = $this->getDoubleLoginNames();
    if (count($doubleLogins) > 0) {
      foreach ($doubleLogins as $login) {
        $this->report('error', "Duplicate login: `$login`");
      }
    }
  }

  private function checkIfBookletsArePresent(Login $testtaker, WorkspaceCache $validator): void {
    foreach ($testtaker->getBooklets() as $code => $booklets) {
      foreach ($booklets as $bookletId) {
        $booklet = $validator->getBooklet($bookletId);

        if ($booklet != null) {
          $this->addRelation(new FileRelation($booklet->getType(), $bookletId, FileRelationshipType::hasBooklet, $booklet));
        }

        if (!$booklet or !$booklet->isValid()) {
          $this->report('error', "Booklet `$bookletId` not found for login `{$testtaker->getName()}`");
        }
      }
    }
  }

  private function checkIfIdsAreUsedInOtherFiles(WorkspaceCache $workspaceCache): void {
    $loginList = $this->getAllLoginNames();
    $groupList = array_keys($this->getGroups());

    $workspaceCache->addGlobalIdSource($this->getName(), 'login', $loginList);
    $workspaceCache->addGlobalIdSource($this->getName(), 'group', $groupList);

    foreach ($workspaceCache->getGlobalIds() as $workspaceId => $sources) {
      foreach ($sources as $source => $globalIdsByType) {
        if ($source == '/name/') {
          continue;
        }
        if (($source == $this->getName()) and ($workspaceId == $workspaceCache->getId())) {
          continue;
        }

        $this->reportDuplicates(
          'login',
          array_intersect($loginList, array_values($globalIdsByType['login'])),
          $source,
          $workspaceCache->getId(),
          $workspaceId,
          $sources['/name/'] ?? 'unknown'
        );
        $this->reportDuplicates(
          'group',
          array_intersect($groupList, array_values($globalIdsByType['group'])),
          $source,
          $workspaceCache->getId(),
          $workspaceId,
          $sources['/name/'] ?? 'unknown'
        );
      }
    }
  }

  private function reportDuplicates(
    string $type,
    array $duplicates,
    string $otherFileName,
    int $thisWsId,
    int $otherWsId,
    string $workspaceName
  ): void {
    foreach ($duplicates as $duplicate) {
      $location = ($thisWsId !== $otherWsId) ? "on workspace `$workspaceName` " : '';
      $location .= "in file `$otherFileName`";
      $this->report('error', "Duplicate $type: `$duplicate` - also $location");
    }
  }

  public function getAllLogins(): LoginArray {
    if (!$this->isValid()) {
      return new LoginArray();
    }

    $testTakers = [];

    foreach ($this->getXml()->xpath('Group') as $groupElement) {
      foreach ($groupElement->xpath('Login[@name]') as $loginElement) {
        $login = $this->getLogin($groupElement, $loginElement, -1);
        $testTakers[] = $login;
      }
    }

    return new LoginArray(...$testTakers);
  }

  public function getDoubleLoginNames(): array {
    if (!$this->isValid()) {
      return [];
    }

    $loginNames = [];

    foreach ($this->getXml()->xpath('Group/Login[@name]') as $loginElement) {
      $loginNames[] = (string) $loginElement['name'];
    }

    return array_keys(array_filter(array_count_values($loginNames), function($count) {
      return $count > 1;
    }));
  }

  public function getAllLoginNames(): array {
    if (!$this->isValid()) {
      return [];
    }

    $loginNames = [];

    foreach ($this->getXml()->xpath('Group/Login[@name]') as $loginElement) {
      if (!in_array((string) $loginElement['name'], $loginNames)) {
        $loginNames[] = (string) $loginElement['name'];
      }
    }

    return $loginNames;
  }

  public function getGroups(): array {
    if (!$this->isValid()) {
      return [];
    }

    $groups = [];

    foreach ($this->getXml()->xpath('Group') as $groupElement) {
      $groups[(string) $groupElement['id']] = new Group(
        (string) $groupElement['id'],
        (string) $groupElement['label']
      );
    }

    return $groups;
  }

  public function getLoginsInSameGroup(string $loginName, int $workspaceId): ?LoginArray {
    if (!$this->isValid()) {
      return null;
    }

    foreach ($this->getXml()->xpath("Group[Login[@name='$loginName']]") as $groupElement) {
      $groupMembers = new LoginArray();

      foreach ($groupElement->xpath("Login[@name!='$loginName'][@mode!='monitor-group'][Booklet]") as $memberElement) {
        $groupMembers->add($this->getLogin($groupElement, $memberElement, $workspaceId));
      }

      return $groupMembers;
    }

    return null;
  }

  private function getLogin(SimpleXMLElement $groupElement, SimpleXMLElement $loginElement, int $workspaceId): Login {
    $mode = (string) $loginElement['mode'];
    $name = (string) $loginElement['name'];
    $booklets = ($mode == 'monitor-group')
      ? ['' => $this->collectBookletsOfGroup($workspaceId, $name)]
      : self::collectBookletsPerCode($loginElement);

    return new Login(
      $name,
      (string) $loginElement['pw'],
      (string) $loginElement['mode'] ?? 'run-demo',
      (string) $groupElement['id'],
      (string) $groupElement['label'] ?? (string) $groupElement['id'],
      $booklets,
      $workspaceId,
      isset($groupElement['validTo']) ? TimeStamp::fromXMLFormat((string) $groupElement['validTo']) : 0,
      TimeStamp::fromXMLFormat((string) $groupElement['validFrom']),
      (int) ($groupElement['validFor'] ?? 0),
      $this->getCustomTexts()
    );
  }

  // TODO write unit test
  // TODO make private
  public function collectBookletsOfGroup(int $workspaceId, string $loginName): array {
    $members = $this->getLoginsInSameGroup($loginName, $workspaceId);
    $booklets = [];

    foreach ($members as $member) {
      /* @var $member Login */

      $codes2booklets = $member->getBooklets() ?? [];

      foreach ($codes2booklets as $bookletList) {
        foreach ($bookletList as $booklet) {
          $booklets[] = $booklet;
        }
      }
    }

    return array_unique($booklets);
  }

  protected static function collectBookletsPerCode(SimpleXMLElement $loginNode): array {
    $noCodeBooklets = [];
    $codeBooklets = [];

    foreach ($loginNode->xpath('Booklet') as $bookletElement) {
      $bookletName = strtoupper(trim((string) $bookletElement));

      if (!$bookletName) {
        continue;
      }

      $codesOfThisBooklet = self::getCodesFromBookletElement($bookletElement);

      if (count($codesOfThisBooklet) > 0) {
        foreach ($codesOfThisBooklet as $c) {
          if (!isset($codeBooklets[$c])) {
            $codeBooklets[$c] = [];
          }

          if (!in_array($bookletName, $codeBooklets[$c])) {
            $codeBooklets[$c][] = $bookletName;
          }
        }

      } else {
        $noCodeBooklets[] = $bookletName;
      }
    }

    $noCodeBooklets = array_unique($noCodeBooklets);

    if (count($codeBooklets) === 0) {
      $codeBooklets = ['' => $noCodeBooklets];

    } else {
      // add all no-code-booklets to every code
      foreach ($codeBooklets as $code => $booklets) {
        $codeBooklets[$code] = array_unique(array_merge($codeBooklets[$code], $noCodeBooklets));
      }
    }

    return $codeBooklets;
  }

  protected static function getCodesFromBookletElement(SimpleXMLElement $bookletElement): array {
    if ($bookletElement->getName() !== 'Booklet') {
      return [];
    }

    $codesString = isset($bookletElement['codes'])
      ? trim((string) $bookletElement['codes'])
      : '';

    if (!$codesString) {
      return [];
    }

    return array_unique(explode(' ', $codesString));
  }

  public function getCustomTexts(): stdClass {
    $customTexts = [];
    foreach ($this->getXml()->xpath('/Testtakers/CustomTexts/CustomText') as $customTextElement) {
      $customTexts[(string) $customTextElement['key'] ?? ''] = (string) $customTextElement;
    }
    return (object) $customTexts;
  }
}

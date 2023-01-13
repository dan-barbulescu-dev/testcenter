<?php
declare(strict_types=1);

class FileRelation extends DataCollectionTypeSafe {

    protected string $targetType = '';
    protected string $targetRequest = '';
    protected FileRelationshipType $relationshipType = FileRelationshipType::unknown;
    protected ?File $target;

    public function __construct(
        string $targetType,
        string $targetId,
        FileRelationshipType $relationshipType = FileRelationshipType::unknown,
        File $target = null
    ) {
        $this->targetType = $targetType;
        $this->targetRequest = $targetId;
        $this->relationshipType = $relationshipType;
        $this->target = $target;
    }


    public function getTargetType(): string {

        return $this->targetType;
    }


    public function getTargetRequest(): string {

        return $this->targetRequest;
    }


    public function getRelationshipType(): FileRelationshipType {

        return $this->relationshipType;
    }

    public function getTarget(): ?File {

        return $this->target;
    }
}
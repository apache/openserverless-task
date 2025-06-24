export interface KubernetesVolume {
    name: string;
    persistentVolumeClaim?: {
        claimName: string;
    };
    configMap?: {
        name: string;
    };
    secret?: {
        secretName: string;
    };
}

export interface VolumeMount {
    name: string;
    mountPath: string;
    readOnly?: boolean;
}

/**
 * Represents a row of data containing information about PVC (Persistent Volume Claim) storage.
 */
export interface DfRow {
    'Pvc Name': string;
    'Size': string;
    'Used': string;
    'Available': string;
    'Use%': string;
}
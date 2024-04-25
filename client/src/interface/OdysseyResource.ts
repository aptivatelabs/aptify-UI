// OdysseyResource.ts
export interface OdysseyResource {
    resource_account: string;
    collection_name: string;
    collection_size: number;
    cover: string;
    description: string;
    odyssey_name: string;
    merkle_root: string;
    minted: number;
    paused: boolean;
    presale_end_time: number;
    presale_mint_fee: number;
    presale_start_time: number;
    public_sales_end_time: number;
    public_sales_mint_fee: number;
    public_sales_start_time: number;
    royalty_denominator: number;
    royalty_numerator: number;
    royalty_payee_address: string;
  }
  
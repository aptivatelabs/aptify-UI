// AssetData.ts
export interface AssetData {
    token_data_id: string;
    current_token_data: {
      token_name: string;
      description: string;
      current_collection: {
        collection_name: string;
        creator_address: string;
        current_supply: number;
      };
      token_uri: string;
    };
  }

  
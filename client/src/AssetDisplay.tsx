import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag } from 'antd';
import { AssetData } from './interface/AssetData'; // Import the AssetData interface

interface Trait {
  trait_type: string;
  value: string;
}

interface AssetDisplayProps {
  data: AssetData[];
}

const AssetDisplay: React.FC<AssetDisplayProps> = ({ data }) => {
  const [coverImages, setCoverImages] = useState<{ [key: string]: string }>({});
  const [traits, setTraits] = useState<{ [key: string]: Trait[] }>({});

  useEffect(() => {
    // Fetch cover images and traits when data changes
    const fetchAssetsData = async () => {
      const coverImagePromises = data.map(async (item) => {
        try {
          const response = await fetch(item.current_token_data.token_uri);
          if (!response.ok) {
            throw new Error("Failed to fetch cover image");
          }
          const assetData = await response.json();
          const imageUrl = assetData.image;
          return { token_data_id: item.token_data_id, imageUrl };
        } catch (error: any) {
          console.error("Error fetching cover image:", error.message);
          return { token_data_id: item.token_data_id, imageUrl: '' };
        }
      });

      const traitsPromises = data.map(async (item) => {
        try {
          const response = await fetch(item.current_token_data.token_uri);
          if (!response.ok) {
            throw new Error("Failed to fetch traits");
          }
          const assetData = await response.json();
          const traits = parseTraits(assetData);
          return { token_data_id: item.token_data_id, traits };
        } catch (error: any) {
          console.error("Error fetching traits:", error.message);
          return { token_data_id: item.token_data_id, traits: [] };
        }
      });

      Promise.all(coverImagePromises).then((results) => {
        const imageMap: { [key: string]: string } = {};
        results.forEach((result) => {
          imageMap[result.token_data_id] = result.imageUrl;
        });
        setCoverImages(imageMap);
      });

      Promise.all(traitsPromises).then((results) => {
        const traitsMap: { [key: string]: Trait[] } = {};
        results.forEach((result) => {
          traitsMap[result.token_data_id] = result.traits;
        });
        setTraits(traitsMap);
      });
    };

    fetchAssetsData();
  }, [data]);

  const parseTraits = (data: any): Trait[] => {
    const attributes = data.attributes || [];
    return attributes.map((attribute: any) => ({
      trait_type: attribute.trait_type || '',
      value: attribute.value || '',
    }));
  };

  return (
    <div style={{ padding: '20px' }}>
      <Row gutter={[16, 16]}>
        {data.map((item, index) => (
          <Col key={index} span={24}>
            <Card
                title={item.current_token_data.token_name}
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}
                bodyStyle={{ display: 'flex', alignItems: 'center' }}
                >
                
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div>
                    <p><strong>Token Address:</strong> {item.token_data_id}</p>
                </div>
                <img src={coverImages[item.token_data_id]} alt={item.current_token_data.token_name} style={{ maxWidth: '250px', maxHeight: '250px', marginRight: '20px' }} />
                <div>
                    <br />
                    <strong>Traits:</strong>
                    <div>
                    {traits[item.token_data_id] &&
                        traits[item.token_data_id].map((trait, traitIndex) => (
                        <Tag key={traitIndex}>{trait.trait_type}: {trait.value}</Tag>
                        ))}
                    </div>
                  {/*<p><strong>Description:</strong> {item.current_token_data.description}</p>
                   <p><strong>Collection Name:</strong> {item.current_token_data.current_collection.collection_name}</p>
                  <p><strong>Creator Address:</strong> {item.current_token_data.current_collection.creator_address}</p>
                  <p><strong>Current Supply:</strong> {item.current_token_data.current_collection.current_supply}</p>
                  <p><strong>Token URI:</strong> <a href={item.current_token_data.token_uri}>{item.current_token_data.token_uri}</a></p> */}
                </div>
              </div>
              
              <div>
                
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default AssetDisplay;

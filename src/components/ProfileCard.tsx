import React from 'react';
import { MapPin, Award, Languages, Badge, Check } from 'lucide-react';
import ContactCard from './ContactCard';

interface ProfileCardProps {
  profile: {
    id: string;
    name: string;
    avatar_url?: string;
    introduction?: string;
    location?: string;
    verified: boolean;
    experience?: string;
    languages?: string[];
    specialties?: string[];
    agency_name?: string;
    agency_logo?: string;
    whatsapp?: string;
    email?: string;
    phone?: string;
  };
  className?: string;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm overflow-hidden ${className}`}>
      {/* Profile Header - Avatar and Basic Info */}
      <div className="p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl text-gray-300">{profile.name.charAt(0)}</span>
              )}
            </div>
            {profile.verified && (
              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 border-2 border-white">
                <Check className="h-4 w-4 text-white" />
              </div>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile.name}</h1>
            
            {profile.agency_name && (
              <div className="flex items-center justify-center sm:justify-start mb-3">
                {profile.agency_logo ? (
                  <img 
                    src={profile.agency_logo} 
                    alt={profile.agency_name} 
                    className="h-6 mr-2 object-contain"
                  />
                ) : null}
                <span className="text-gray-600">{profile.agency_name}</span>
              </div>
            )}
            
            {profile.introduction && (
              <p className="text-gray-600 mb-4">{profile.introduction}</p>
            )}
            
            {/* Location and Experience */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mb-3">
              {profile.location && (
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-1 text-primary-300" />
                  <span className="text-sm">{profile.location}</span>
                </div>
              )}
              
              {profile.experience && (
                <div className="flex items-center text-gray-600">
                  <Award className="h-4 w-4 mr-1 text-primary-300" />
                  <span className="text-sm">{profile.experience}</span>
                </div>
              )}
              
              {profile.verified && (
                <div className="flex items-center text-green-600">
                  <Badge className="h-4 w-4 mr-1" />
                  <span className="text-sm">Verified</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section - Languages & Specialties */}
      <div className="px-6 sm:px-8 pb-6">
        {/* Languages */}
        {profile.languages && profile.languages.length > 0 && (
          <div className="mb-4">
            <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Languages className="h-4 w-4 mr-1 text-primary-300" />
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.languages.map((language, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {/* Specialties */}
        {profile.specialties && profile.specialties.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Specialties
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((specialty, index) => (
                <span 
                  key={index} 
                  className="px-3 py-1 bg-primary-100 rounded-full text-sm text-primary-700"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contact Card */}
      <div className="border-t border-gray-100 bg-gray-50 px-6 sm:px-8 py-4">
        <ContactCard 
          whatsapp={profile.whatsapp}
          email={profile.email}
          phone={profile.phone}
        />
      </div>
    </div>
  );
};

export default ProfileCard;
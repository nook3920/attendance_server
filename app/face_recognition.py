import os
import os.path
import re
import cv2
import dlib
import imutils
from sklearn import neighbors
import pickle
import math
import time
face_detector = dlib.cnn_face_detection_model_v1(
    './models/mmod_human_face_detector.dat')
sp = dlib.shape_predictor(
    './models/shape_predictor_5_face_landmarks.dat')
face_recogni = dlib.face_recognition_model_v1(
    "./models/dlib_face_recognition_resnet_model_v1.dat")
train_dir = 'datasets'


def image_files_in_folder(folder):
    return [os.path.join(folder, f) for f in os.listdir(folder) if re.match(r'.*\.(jpg|jpeg|png)', f, flags=re.I)]


def load_computed_descriptor():
    data = {}
    try:
        with open('computed_descript.pkl', 'rb') as f:
            return pickle.load(f)
    except:
        print('computed data not found creating file...')
        with open('computed_descript.pkl', 'wb') as f:
            pickle.dump(data, f)
            return data


def save_computed_descriptor(data):
    with open('computed_descript.pkl', 'wb') as f:
        pickle.dump(data, f)


def delete_computed_descriptor(filename):
    computed_descriptor = load_computed_descriptor()
    user_id = filename.split('_')[0]
    fname = filename.split('_')[1]
    picpath = 'datasets\\{}\\{}'.format(user_id, filename)
    # print(computed_descriptor)
    try:
        del computed_descriptor[user_id][picpath]
        save_computed_descriptor(computed_descriptor)
    except:
        return 'wrong file name'
    # print(computed_descriptor)
    return '{} deleted'.format(filename)
    
    


def train():
    X = []
    y = []
    computed_descriptor = load_computed_descriptor()
    n_neighbors = None
    model_save_path = 'trained_knn_model.clf'

    start = time.time()
    for class_dir in os.listdir(train_dir):
        if not os.path.isdir(os.path.join(train_dir, class_dir)):
            continue
        if computed_descriptor.get(class_dir) is None:
            computed_descriptor[class_dir] = {}
        
        for img_path in image_files_in_folder(os.path.join(train_dir, class_dir)):
            if computed_descriptor[class_dir].get(img_path) is not None:
                X.append(computed_descriptor[class_dir][img_path])
                y.append(class_dir)
            else:
                image = cv2.imread(img_path)
                image = imutils.resize(image, width=480)
                face_location = face_detector(image, 1)
                if len(face_location) is not 1:
                    print('skip train this image {}'.format(img_path))
                else:
                    face_landmark = sp(image, face_location[0].rect)
                    computed_descriptor[class_dir][img_path] = face_recogni.compute_face_descriptor(image, face_landmark, 100)
                    X.append(computed_descriptor[class_dir][img_path])
                    y.append(class_dir)

    save_computed_descriptor(computed_descriptor)
    if len(X) == 0:
        print('no data to train')
        return 'no data to train'
    if n_neighbors is None:
        n_neighbors = int(round(math.sqrt(len(X))))
        print('Chose n_neightbors automatically: {}'.format(n_neighbors))

    knn_clf = neighbors.KNeighborsClassifier(n_neighbors=n_neighbors, algorithm='ball_tree', weights='distance')
    knn_clf.fit(X, y)

    with open(model_save_path, 'wb') as f:
        pickle.dump(knn_clf, f)
    end = time.time()
    print('train done {}'.format(end-start))
    return 'train complete'

def predict(img):
    knn_clf = None
    with open('trained_knn_model.clf', 'rb') as f:
        knn_clf = pickle.load(f)
    image = img
    # image = cv2.imread('test2.jpg')
    image = imutils.resize(image, width=480)
    face_locations = face_detector(image, 1)

    if len(face_locations) == 0:
        return []
    
    face_landmarks = dlib.full_object_detections()
    for face_location in face_locations:
        face_landmarks.append(sp(image, face_location.rect))
    faces_encodings = face_recogni.compute_face_descriptor(image, face_landmarks)

    closest_distances = knn_clf.kneighbors(faces_encodings, n_neighbors=1)
    are_matches = [(closest_distances[0][i][0] <= 0.40, closest_distances[0][i][0]) for i in range(len(face_locations))]
    # print(closest_distances)
    
    # print(face_encodings)
    # print(knn_clf.predict([faces_encodings[0]]))
    return [(pred, loc.rect, rec[1]) if rec[0] else ('unknow', loc.rect, rec[1]) for pred, loc, rec in zip(knn_clf.predict(faces_encodings), face_locations, are_matches)]